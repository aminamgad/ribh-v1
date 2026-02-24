'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { MessageSquare, Send, Reply, Edit2, Trash2, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface Comment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    role: string;
    companyName?: string;
    avatar?: string;
  };
  content: string;
  isInternal: boolean;
  createdAt: string;
  replies?: Comment[];
  repliesCount?: number;
  isRead?: boolean;
}

interface CommentsSectionProps {
  entityType: 'product' | 'order' | 'fulfillment';
  entityId: string;
  className?: string;
}

export default function CommentsSection({ entityType, entityId, className = '' }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      } else {
        toast.error('فشل في جلب التعليقات');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب التعليقات');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchComments();
  }, [entityId, fetchComments]);

  useEffect(() => {
    scrollToBottom();
  }, [comments, scrollToBottom]);

  useEffect(() => {
    if (comments.length > 0) setCollapsed(false);
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId,
          content: newComment.trim(),
          isInternal: isInternal && (user?.role === 'admin' || user?.role === 'supplier')
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewComment('');
        setIsInternal(true);
        await fetchComments();
        toast.success('تم إضافة التعليق بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في إضافة التعليق');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة التعليق');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId,
          content: replyContent.trim(),
          parentId,
          isInternal: isInternal && (user?.role === 'admin' || user?.role === 'supplier')
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setReplyingTo(null);
        setIsInternal(true);
        await fetchComments();
        toast.success('تم إضافة الرد بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في إضافة الرد');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة الرد');
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim()
        }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditContent('');
        await fetchComments();
        toast.success('تم تحديث التعليق بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في تحديث التعليق');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث التعليق');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchComments();
        toast.success('تم حذف التعليق بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في حذف التعليق');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف التعليق');
    }
  };

  const canEditDelete = (comment: Comment) => {
    return comment.userId._id === user?._id || user?.role === 'admin';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'supplier': return 'المورد';
      case 'admin': return 'الإدارة';
      case 'marketer': return 'المسوق';
      case 'wholesaler': return 'تاجر الجملة';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center py-8`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9800]"></div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-3`}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-right"
        aria-expanded={!collapsed}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-[#FF9800]" />
          التعليقات والمناقشات ({comments.length})
        </h3>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400 flex-shrink-0" /> : <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400 flex-shrink-0" />}
      </button>

      {!collapsed && (
        <>
          {/* نموذج إضافة تعليق - مضغوط */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <div className="space-y-2">
              {(user?.role === 'admin' || user?.role === 'supplier') && (
                <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="flex items-center gap-1">
                    {isInternal ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isInternal ? 'داخلي (للمورد والإدارة)' : 'عام'}
                  </span>
                </label>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="اكتب تعليقك هنا..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 resize-none"
                rows={2}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  إضافة تعليق
                </button>
              </div>
            </div>
          </div>

          {/* قائمة التعليقات */}
          <div className="space-y-2">
            {comments.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-1 opacity-50" />
                <p className="text-xs">لا توجد تعليقات بعد. كن أول من يعلق!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  user={user}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyContent={replyContent}
                  setReplyContent={setReplyContent}
                  onReply={handleReply}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canEditDelete={canEditDelete}
                  getRoleLabel={getRoleLabel}
                  isInternal={isInternal}
                  setIsInternal={setIsInternal}
                />
              ))
            )}
          </div>
          <div ref={commentsEndRef} />
        </>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  user,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  onReply,
  editingId,
  setEditingId,
  editContent,
  setEditContent,
  onEdit,
  onDelete,
  canEditDelete,
  getRoleLabel,
  isInternal,
  setIsInternal
}: any) {
  const isEditing = editingId === comment._id;
  const isReplying = replyingTo === comment._id;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-xs">
            {comment.userId.name.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {comment.userId.name}
                </h4>
                {comment.isInternal && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> داخلي
                  </span>
                )}
                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                  {getRoleLabel(comment.userId.role)}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm', { locale: enUS })}
              </p>
            </div>
            
            {canEditDelete(comment) && !isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingId(comment._id);
                    setEditContent(comment.content);
                  }}
                  className="text-gray-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
                  title="تعديل"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(comment._id)}
                  className="text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-1.5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 resize-none"
                rows={2}
              />
              <div className="flex items-center gap-1.5">
                <button onClick={() => onEdit(comment._id)} className="px-2.5 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">حفظ</button>
                <button onClick={() => { setEditingId(null); setEditContent(''); }} className="px-2.5 py-1 text-xs bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600">إلغاء</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap mb-2">
              {comment.content}
            </p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isReplying) {
                    setReplyingTo(null);
                    setReplyContent('');
                  } else {
                    setReplyingTo(comment._id);
                  }
                }}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <Reply className="w-3.5 h-3.5" />
                {isReplying ? 'إلغاء الرد' : 'رد'}
              </button>
              
              {comment.repliesCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {comment.repliesCount} رد
                </span>
              )}
            </div>
          )}

          {isReplying && (
            <div className="mt-3 pr-3 border-r-2 border-primary-200 dark:border-primary-800">
              <div className="space-y-1.5">
                {(user?.role === 'admin' || user?.role === 'supplier') && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="w-3.5 h-3.5 text-primary-600 rounded focus:ring-primary-500" />
                    <span className="flex items-center gap-1">{isInternal ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}{isInternal ? 'رد داخلي' : 'رد عام'}</span>
                  </label>
                )}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 resize-none"
                  rows={1}
                />
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onReply(comment._id)} disabled={!replyContent.trim()} className="px-2.5 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1">
                    <Send className="w-3 h-3" /> إرسال
                  </button>
                  <button onClick={() => { setReplyingTo(null); setReplyContent(''); }} className="px-2.5 py-1 text-xs bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600">
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2 pr-3 border-r-2 border-gray-200 dark:border-slate-700">
              {comment.replies.map((reply: Comment) => (
                <div key={reply._id} className="bg-gray-50 dark:bg-slate-900 rounded-lg p-2">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-medium text-gray-900 dark:text-slate-100">{reply.userId.name}</h5>
                        {reply.isInternal && (
                          <span className="inline-flex px-1 py-0.5 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full"><Lock className="w-2.5 h-2.5" /></span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">{format(new Date(reply.createdAt), 'dd MMM yyyy HH:mm', { locale: enUS })}</p>
                    </div>
                    
                    {canEditDelete(reply) && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingId(reply._id);
                            setEditContent(reply.content);
                          }}
                          className="text-gray-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDelete(reply._id)}
                          className="text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

