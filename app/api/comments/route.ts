import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectDB from '@/lib/database';
import Comment from '@/models/Comment';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

const createCommentSchema = z.object({
  entityType: z.enum(['product', 'order', 'fulfillment']),
  entityId: z.string().min(1, 'معرف الكيان مطلوب'),
  content: z.string().min(1, 'محتوى التعليق مطلوب').max(2000, 'التعليق لا يمكن أن يتجاوز 2000 حرف'),
  parentId: z.string().optional(),
  isInternal: z.boolean().optional().default(true)
});

// GET /api/comments - Get comments for an entity
export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const parentId = searchParams.get('parentId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, message: 'نوع الكيان ومعرفه مطلوبان' },
        { status: 400 }
      );
    }

    let comments;

    if (parentId) {
      // Get replies for a specific comment
      comments = await (Comment as any).getReplies(parentId);
    } else {
      // Get top-level comments for the entity
      comments = await (Comment as any).getEntityComments(
        entityType,
        entityId,
        user._id.toString(),
        user.role
      );
    }

    // Get replies count for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment: any) => {
        const replies = await (Comment as any).getReplies(comment._id.toString());
        return {
          ...comment.toObject(),
          replies: replies,
          repliesCount: replies.length,
          isRead: comment.readBy?.some((id: any) => id.toString() === user._id.toString()) || false
        };
      })
    );

    return NextResponse.json({
      success: true,
      comments: commentsWithReplies
    });
    
    logger.apiResponse('GET', '/api/comments', 200);
  } catch (error) {
    logger.error('Error fetching comments', error, { userId: user?._id });
    return handleApiError(error, 'حدث خطأ أثناء جلب التعليقات');
  }
});

// POST /api/comments - Create a new comment
export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    await connectDB();

    const body = await req.json();
    const validatedData = createCommentSchema.parse(body);

    // Verify entity exists and populate supplierId and customerId
    let entity;
    if (validatedData.entityType === 'product') {
      const Product = (await import('@/models/Product')).default;
      entity = await Product.findById(validatedData.entityId)
        .populate('supplierId', 'name email _id');
    } else if (validatedData.entityType === 'order') {
      const Order = (await import('@/models/Order')).default;
      entity = await Order.findById(validatedData.entityId)
        .populate('supplierId', 'name email _id')
        .populate('customerId', 'name email _id');
    } else if (validatedData.entityType === 'fulfillment') {
      const FulfillmentRequest = (await import('@/models/FulfillmentRequest')).default;
      entity = await FulfillmentRequest.findById(validatedData.entityId)
        .populate('supplierId', 'name email _id');
    }

    if (!entity) {
      return NextResponse.json(
        { success: false, message: 'الكيان المحدد غير موجود' },
        { status: 404 }
      );
    }

    logger.apiRequest('POST', '/api/comments', { userId: user._id, entityType: validatedData.entityType });
    logger.debug('Entity loaded for comment', {
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      hasSupplierId: !!entity.supplierId
    });

    // Check permissions
    // Suppliers and admins can add internal comments
    // Others can only add non-internal comments
    const isInternal = validatedData.isInternal ?? true;
    if (isInternal && user.role !== 'admin' && user.role !== 'supplier') {
      return NextResponse.json(
        { success: false, message: 'غير مصرح لك بإضافة تعليقات داخلية' },
        { status: 403 }
      );
    }

    // If parentId is provided, verify it exists and get parent comment author
    let parentCommentAuthorId: string | null = null;
    if (validatedData.parentId) {
      const parentComment = await Comment.findById(validatedData.parentId)
        .populate('userId', 'name email role');
      if (!parentComment) {
        return NextResponse.json(
          { success: false, message: 'التعليق الأصلي غير موجود' },
          { status: 404 }
        );
      }
      // Get parent comment author ID
      if (parentComment.userId) {
        parentCommentAuthorId = typeof parentComment.userId === 'object' && parentComment.userId._id
          ? parentComment.userId._id.toString()
          : parentComment.userId.toString();
      }
    }

    const comment = await Comment.create({
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      userId: user._id,
      content: validatedData.content,
      parentId: validatedData.parentId || null,
      isInternal: isInternal,
      readBy: [user._id] // Creator has read it
    });

    await comment.populate('userId', 'name email role companyName avatar');
    await comment.populate('readBy', 'name');

    // Send notification to relevant users using unified notification system
    try {
      const { sendNotificationToUser, isUserOnline } = await import('@/lib/notifications');
      
      // Notify admin if comment is from supplier
      if (user.role === 'supplier') {
        const User = (await import('@/models/User')).default;
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
        
        const adminNotifications = admins.map(async (admin: any) => {
          const adminIdStr = (admin._id?.toString()) || String(admin._id);
          const adminIsOnline = await isUserOnline(adminIdStr);
          
          await sendNotificationToUser(
            adminIdStr,
            {
              title: 'تعليق جديد',
              message: `تعليق جديد من ${user.name} على ${validatedData.entityType === 'product' ? 'منتج' : validatedData.entityType === 'order' ? 'طلب' : 'طلب تخزين'}`,
              type: 'info',
              actionUrl: `/dashboard/${validatedData.entityType === 'product' ? 'products' : validatedData.entityType === 'order' ? 'orders' : 'fulfillment'}/${validatedData.entityId}`,
              metadata: { 
                commentId: comment._id.toString(),
                entityType: validatedData.entityType,
                entityId: validatedData.entityId
              }
            },
            {
              sendEmail: !adminIsOnline, // Send email if admin is offline
              sendSocket: true
            }
          );
        });
        
        await Promise.all(adminNotifications);
      }
      
      // Notify supplier if comment is from admin
      if (user.role === 'admin') {
        let supplierId: string | null = null;
        let entityName = '';
        
        logger.debug('Admin comment - Extracting supplier ID', {
          entityType: validatedData.entityType,
          hasSupplierId: !!entity.supplierId
        });
        
        if (validatedData.entityType === 'product') {
          // Handle supplierId as object or string
          if (entity.supplierId) {
            if (typeof entity.supplierId === 'object' && entity.supplierId._id) {
              supplierId = entity.supplierId._id.toString();
            } else if (typeof entity.supplierId === 'object' && entity.supplierId.toString) {
              supplierId = entity.supplierId.toString();
            } else {
              supplierId = String(entity.supplierId);
            }
          }
          entityName = entity.name || 'منتجك';
        } else if (validatedData.entityType === 'order') {
          if (entity.supplierId) {
            if (typeof entity.supplierId === 'object' && entity.supplierId._id) {
              supplierId = entity.supplierId._id.toString();
            } else if (typeof entity.supplierId === 'object' && entity.supplierId.toString) {
              supplierId = entity.supplierId.toString();
            } else {
              supplierId = String(entity.supplierId);
            }
          }
          entityName = `طلب #${entity.orderNumber || validatedData.entityId}`;
        } else if (validatedData.entityType === 'fulfillment') {
          if (entity.supplierId) {
            if (typeof entity.supplierId === 'object' && entity.supplierId._id) {
              supplierId = entity.supplierId._id.toString();
            } else if (typeof entity.supplierId === 'object' && entity.supplierId.toString) {
              supplierId = entity.supplierId.toString();
            } else {
              supplierId = String(entity.supplierId);
            }
          }
          entityName = 'طلب التخزين';
        }
        
        logger.debug('Sending notification to supplier', {
          supplierId,
          entityType: validatedData.entityType,
          entityId: validatedData.entityId
        });
        
        if (supplierId && supplierId !== user._id.toString()) {
          const supplierIsOnline = await isUserOnline(supplierId);
          
          await sendNotificationToUser(
            supplierId,
            {
              title: 'تعليق جديد من الإدارة',
              message: `تعليق جديد من الإدارة على ${validatedData.entityType === 'product' ? `منتجك "${entityName}"` : validatedData.entityType === 'order' ? entityName : entityName}`,
              type: 'info',
              actionUrl: `/dashboard/${validatedData.entityType === 'product' ? 'products' : validatedData.entityType === 'order' ? 'orders' : 'fulfillment'}/${validatedData.entityId}`,
              metadata: { 
                commentId: comment._id.toString(),
                entityType: validatedData.entityType,
                entityId: validatedData.entityId,
                entityName: entityName
              }
            },
            {
              sendEmail: !supplierIsOnline, // Send email if supplier is offline
              sendSocket: true
            }
          );
          
          logger.info('Notification sent to supplier', { 
            supplierId, 
            commentId: comment._id.toString(),
            supplierIsOnline,
            emailSent: !supplierIsOnline
          });
        } else {
          logger.debug('No supplier ID found or supplier is the same as admin', {
            hasSupplierId: !!supplierId,
            isSameUser: supplierId === user._id.toString()
          });
        }
      }
      
      // Notify supplier if comment is from marketer/wholesaler
      if ((user.role === 'marketer' || user.role === 'wholesaler')) {
        let supplierId: string | null = null;
        let entityName = '';
        
        if (validatedData.entityType === 'product') {
          if (entity.supplierId) {
            supplierId = typeof entity.supplierId === 'object' && entity.supplierId._id 
              ? entity.supplierId._id.toString() 
              : entity.supplierId.toString();
          }
          entityName = entity.name || 'منتجك';
        } else if (validatedData.entityType === 'order') {
          if (entity.supplierId) {
            supplierId = typeof entity.supplierId === 'object' && entity.supplierId._id 
              ? entity.supplierId._id.toString() 
              : entity.supplierId.toString();
          }
          entityName = `طلب #${entity.orderNumber || validatedData.entityId}`;
        }
        
        if (supplierId && supplierId !== user._id.toString()) {
          logger.debug('Notifying supplier about comment from marketer/wholesaler', { supplierId });
          
          const supplierIsOnline = await isUserOnline(supplierId);
          
          await sendNotificationToUser(
            supplierId,
            {
              title: 'تعليق جديد من مسوق',
              message: `تعليق جديد من ${user.name} (${user.role === 'marketer' ? 'مسوق' : 'تاجر'}) على ${validatedData.entityType === 'product' ? `منتجك "${entityName}"` : entityName}`,
              type: 'info',
              actionUrl: `/dashboard/${validatedData.entityType === 'product' ? 'products' : 'orders'}/${validatedData.entityId}`,
              metadata: { 
                commentId: comment._id.toString(),
                entityType: validatedData.entityType,
                entityId: validatedData.entityId,
                entityName: entityName
              }
            },
            {
              sendEmail: !supplierIsOnline, // Send email if supplier is offline
              sendSocket: true
            }
          );
          
          logger.info('Notification sent to supplier for marketer comment', {
            supplierId,
            commentId: comment._id.toString(),
            supplierIsOnline,
            emailSent: !supplierIsOnline
          });
        }
      }
      
      // Notify marketer/wholesaler if comment is from supplier (on order)
      if (user.role === 'supplier' && validatedData.entityType === 'order') {
        let customerId: string | null = null;
        if (entity.customerId) {
          customerId = typeof entity.customerId === 'object' && entity.customerId._id 
            ? entity.customerId._id.toString() 
            : entity.customerId.toString();
        }
        
        if (customerId && customerId !== user._id.toString()) {
          logger.debug('Notifying marketer/wholesaler about comment from supplier', { customerId });
          
          const customerIsOnline = await isUserOnline(customerId);
          
          await sendNotificationToUser(
            customerId,
            {
              title: 'تعليق جديد من المورد',
              message: `تعليق جديد من المورد ${user.name} على طلبك #${entity.orderNumber || validatedData.entityId}`,
              type: 'info',
              actionUrl: `/dashboard/orders/${validatedData.entityId}`,
              metadata: { 
                commentId: comment._id.toString(),
                entityType: validatedData.entityType,
                entityId: validatedData.entityId,
                orderNumber: entity.orderNumber
              }
            },
            {
              sendEmail: !customerIsOnline, // Send email if customer is offline
              sendSocket: true
            }
          );
          
          logger.info('Notification sent to customer for supplier comment', {
            customerId,
            commentId: comment._id.toString(),
            customerIsOnline,
            emailSent: !customerIsOnline
          });
        }
      }
      
      // Also notify supplier if comment is from another supplier (on same product)
      if (user.role === 'supplier' && validatedData.entityType === 'product') {
        // Get the product owner
        let productOwnerId: string | null = null;
        if (entity.supplierId) {
          productOwnerId = typeof entity.supplierId === 'object' && entity.supplierId._id 
            ? entity.supplierId._id.toString() 
            : entity.supplierId.toString();
        }
        
        // Only notify if the commenter is not the product owner
        if (productOwnerId && productOwnerId !== user._id.toString()) {
          logger.debug('Notifying product owner about comment from another supplier', { productOwnerId });
          
          const ownerIsOnline = await isUserOnline(productOwnerId);
          
          await sendNotificationToUser(
            productOwnerId,
            {
              title: 'تعليق جديد',
              message: `تعليق جديد من ${user.name} على منتجك "${entity.name || 'منتج'}"`,
              type: 'info',
              actionUrl: `/dashboard/products/${validatedData.entityId}`,
              metadata: { 
                commentId: comment._id.toString(),
                entityType: validatedData.entityType,
                entityId: validatedData.entityId
              }
            },
            {
              sendEmail: !ownerIsOnline, // Send email if owner is offline
              sendSocket: true
            }
          );
          
          logger.info('Notification sent to product owner for supplier comment', {
            productOwnerId,
            commentId: comment._id.toString(),
            ownerIsOnline,
            emailSent: !ownerIsOnline
          });
        }
      }
      
      // Notify parent comment author if this is a reply
      if (validatedData.parentId && parentCommentAuthorId && parentCommentAuthorId !== user._id.toString()) {
        logger.debug('Sending notification to parent comment author', { parentCommentAuthorId });
        
        const parentAuthorIsOnline = await isUserOnline(parentCommentAuthorId);
        
        await sendNotificationToUser(
          parentCommentAuthorId,
          {
            title: 'رد على تعليقك',
            message: `رد جديد من ${user.name} على تعليقك`,
            type: 'info',
            actionUrl: `/dashboard/${validatedData.entityType === 'product' ? 'products' : validatedData.entityType === 'order' ? 'orders' : 'fulfillment'}/${validatedData.entityId}`,
            metadata: { 
              commentId: comment._id.toString(),
              parentCommentId: validatedData.parentId,
              entityType: validatedData.entityType,
              entityId: validatedData.entityId
            }
          },
          {
            sendEmail: !parentAuthorIsOnline, // Send email if author is offline
            sendSocket: true
          }
        );
        
        logger.info('Notification sent to parent comment author', {
          parentCommentAuthorId,
          commentId: comment._id.toString(),
          parentAuthorIsOnline,
          emailSent: !parentAuthorIsOnline
        });
      }
    } catch (notifError) {
      logger.error('Error sending notification', notifError);
      // Don't fail the request if notification fails
    }

    logger.apiResponse('POST', '/api/comments', 201);
    
    return NextResponse.json({
      success: true,
      message: 'تم إضافة التعليق بنجاح',
      comment: {
        ...comment.toObject(),
        replies: [],
        repliesCount: 0,
        isRead: true
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Comment validation failed', { errors: error.errors, userId: user._id });
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      );
    }

    logger.error('Error creating comment', error, { userId: user._id });
    return handleApiError(error, 'حدث خطأ أثناء إضافة التعليق');
  }
});

