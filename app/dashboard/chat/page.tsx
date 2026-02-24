'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { hasAnyOfPermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useChat } from '@/components/providers/ChatProvider';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  Plus,
  X,
  Search,
  Filter,
  MoreVertical,
  Paperclip,
  Image,
  File,
  Download,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  User,
  Users,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NewChatForm {
  subject: string;
  message: string;
  category: string;
  recipientId?: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    chats,
    currentChat,
    loading,
    totalUnread,
    fetchChats,
    fetchChat,
    createChat,
    sendMessage,
    markAsRead,
    closeChat,
    setCurrentChat
  } = useChat();

  const [showNewChat, setShowNewChat] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newChatForm, setNewChatForm] = useState<NewChatForm>({
    subject: '',
    message: '',
    category: 'general'
  });
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<Array<{_id: string, name: string, email: string, role: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto scroll to bottom when new messages
  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, scrollToBottom]);

  // لا نحدث الرسائل تلقائياً - نترك المستخدم يتحكم في ذلك
  // useEffect(() => {
  //   if (!currentChat) return;

  //   const interval = setInterval(async () => {
  //     try {
  //       // نحصل على الرسائل الجديدة بدون تحديث unreadCount
  //       const response = await fetch(`/api/chat/${currentChat._id}`, {
  //         credentials: 'include'
  //       });
        
  //       if (response.ok) {
  //         const data = await response.json();
  //         const updatedChat = data.chat;
          
  //         // نحتفظ بـ unreadCount الحالي ولا نحدثه
  //         setCurrentChat(prev => prev ? {
  //           ...updatedChat,
  //           unreadCount: prev.unreadCount // نحتفظ بالعداد الحالي
  //         } : null);
  //       }
  //     } catch (error) {
  //     }
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, [currentChat]);

  // Mark messages as read ONLY when user manually opens the chat
  useEffect(() => {
    if (currentChat && currentChat.unreadCount > 0) {
      // لا نستدعي markAsRead تلقائياً - فقط عند فتح المحادثة يدوياً
    }
  }, [currentChat]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      // Silently handle errors
    }
  }, []);

  // حارس الوصول: الأدمن يحتاج messages.view أو messages.reply أو messages.moderate لعرض المحادثات
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const canAccess = hasAnyOfPermissions(user, [PERMISSIONS.MESSAGES_VIEW, PERMISSIONS.MESSAGES_REPLY, PERMISSIONS.MESSAGES_MODERATE]);
    if (!canAccess) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Fetch users for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const handleCreateChat = async () => {
    if (!newChatForm.subject || !newChatForm.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSending(true);
    try {
      const chat = await createChat(
        newChatForm.subject,
        newChatForm.message,
        newChatForm.recipientId,
        newChatForm.category
      );

      if (chat) {
        setShowNewChat(false);
        setNewChatForm({ subject: '', message: '', category: 'general' });
        setCurrentChat(chat);
        toast.success('تم إنشاء المحادثة بنجاح');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء المحادثة');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChat || sending) return;

    setSending(true);
    const messageToSend = messageInput.trim();
    setMessageInput(''); // مسح الحقل فوراً

    try {
      const success = await sendMessage(currentChat._id, messageToSend);
      if (success) {
        // التمرير للأسفل بعد إرسال الرسالة
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        // إعادة النص في حالة الفشل
        setMessageInput(messageToSend);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الرسالة');
      // إعادة النص في حالة الفشل
      setMessageInput(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseChat = async () => {
    if (!currentChat) return;

    try {
      await closeChat(currentChat._id);
      setCurrentChat(null);
      toast.success('تم إغلاق المحادثة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء إغلاق المحادثة');
    }
  };

  const filteredChats = chats.filter(chat => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchSubject = chat.subject.toLowerCase().includes(query);
      const matchParticipant = chat.participants.some(p => 
        p.name.toLowerCase().includes(query) || 
        p.email.toLowerCase().includes(query)
      );
      const matchMessage = chat.lastMessage && (
        typeof chat.lastMessage === 'string' 
          ? chat.lastMessage.toLowerCase().includes(query)
          : (chat.lastMessage as any)?.message?.toLowerCase().includes(query)
      );
      
      if (!matchSubject && !matchParticipant && !matchMessage) {
        return false;
      }
    }

    // Filter by status
    if (filterStatus !== 'all' && chat.status !== filterStatus) {
      return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">نشط</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">مغلق</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">قيد الانتظار</span>;
      default:
        return null;
    }
  };

  const getMessageStatus = (message: any) => {
    const senderId = (message.senderId as any)?._id ?? (message.senderId as any);
    if (!senderId || String(senderId) !== String(user?._id)) return null;
    
    if (message.isRead) {
      return <CheckCheck className="w-3 h-3 text-[#4CAF50]" />;
    } else {
      return <Check className="w-3 h-3 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'supplier': return 'المورد';
      case 'marketer': return 'المسوق';
      case 'wholesaler': return 'تاجر الجملة';
      case 'admin': return 'الإدارة';
      default: return role;
    }
  };

  const [showChatsList, setShowChatsList] = useState(true);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900">
      {/* Chats List */}
      <div className={`${currentChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex-col ${showChatsList ? 'flex' : 'hidden'}`}>
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                محادثات الدعم
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">محادثات مباشرة مع الإدارة (بدون مراجعة)</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => fetchChats()}
                className="text-xs sm:text-sm text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] px-2 sm:px-3 py-1 rounded border border-[#FF9800] hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 min-h-[36px] sm:min-h-[44px]"
              >
                تحديث
              </button>
              {(user?.role !== 'admin' || hasPermission(user, PERMISSIONS.MESSAGES_REPLY) || hasPermission(user, PERMISSIONS.MESSAGES_MODERATE)) && (
              <button
                onClick={() => setShowNewChat(true)}
                className="btn-primary text-xs sm:text-sm min-h-[36px] sm:min-h-[44px] px-2 sm:px-3"
              >
                <span className="hidden sm:inline">محادثة جديدة</span>
                <span className="sm:hidden">جديدة</span>
              </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2 sm:mb-3">
            <Search className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المحادثات..."
              className="input-field pr-9 sm:pr-11 text-xs sm:text-sm min-h-[44px]"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 text-xs sm:text-sm input-field min-h-[44px]"
            >
              <option value="all">جميع المحادثات</option>
              <option value="active">النشطة</option>
              <option value="pending">قيد الانتظار</option>
              <option value="closed">المغلقة</option>
            </select>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="loading-spinner mx-auto"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                لا توجد محادثات
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredChats.map((chat) => {
                const otherParticipant = chat.participants.find(p => p._id !== user?._id);
                const isSelected = currentChat?._id === chat._id;
                
                return (
                  <button
                    key={chat._id}
                    onClick={async () => {
                      // جلب المحادثة من الخادم للحصول على أحدث البيانات
                      const fetchedChat = await fetchChat(chat._id);
                      if (fetchedChat) {
                        setCurrentChat(fetchedChat);
                        setShowChatsList(false); // إخفاء قائمة المحادثات على الموبايل
                      } else {
                        // في حالة الفشل، استخدم البيانات المحلية
                        setCurrentChat(chat);
                        setShowChatsList(false); // إخفاء قائمة المحادثات على الموبايل
                      }
                    }}
                    className={`w-full p-3 sm:p-4 text-right hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors active:scale-[0.98] min-h-[80px] ${
                      isSelected ? 'bg-[#FF9800]/10 dark:bg-[#FF9800]/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-slate-300">
                          {otherParticipant?.name.charAt(0) || '؟'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                              {chat.subject}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">
                              {otherParticipant?.name} • {getRoleLabel(otherParticipant?.role || '')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {getStatusBadge(chat.status)}
                            {chat.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-medium">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {chat.lastMessage && (
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 truncate mb-0.5 text-wrap-long">
                            {typeof chat.lastMessage === 'string' ? chat.lastMessage : (chat.lastMessage as any).message}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500">
                          {chat.updatedAt ? format(new Date(chat.updatedAt), 'dd/MM/yyyy HH:mm', { locale: enUS }) : 'غير محدد'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${currentChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Back Button for Mobile */}
                  <button
                    onClick={() => {
                      setCurrentChat(null);
                      setShowChatsList(true);
                    }}
                    className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FF9800] rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {currentChat.subject}
                    </h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 flex-wrap">
                      {getStatusBadge(currentChat.status)}
                      {currentChat.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                          {currentChat.unreadCount} رسالة جديدة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  {currentChat.unreadCount > 0 && (
                    <button
                      onClick={() => markAsRead(currentChat._id)}
                      className="text-xs sm:text-sm text-[#FF9800] hover:text-[#F57C00] dark:text-[#FF9800] dark:hover:text-[#F57C00] px-2 sm:px-3 py-1 rounded border border-[#FF9800] hover:bg-[#FF9800]/10 dark:hover:bg-[#FF9800]/20 min-h-[36px] sm:min-h-[44px]"
                    >
                      <span className="hidden sm:inline">تحديد كمقروءة</span>
                      <span className="sm:hidden">مقروءة</span>
                    </button>
                  )}
                  <button
                    onClick={handleCloseChat}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
              {currentChat.messages && currentChat.messages.length > 0 ? (
                currentChat.messages.map((message, index) => {
                  // تحسين تحديد الرسائل - رسائلي أم لا
                  const isMe = (message.senderId as any)?._id === user?._id || (message.senderId as any) === user?._id;
                  
                  const showDate = index === 0 || 
                    (currentChat.messages[index - 1]?.createdAt && 
                     format(new Date(message.createdAt), 'yyyy-MM-dd') !== 
                     format(new Date(currentChat.messages[index - 1].createdAt), 'yyyy-MM-dd'));

                  return (
                    <div key={message._id}>
                      {showDate && (
                        <div className="text-center mb-2 sm:mb-4">
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                            {message.createdAt ? format(new Date(message.createdAt), 'dd MMMM yyyy', { locale: enUS }) : 'غير محدد'}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                        <div className={`max-w-[85%] sm:max-w-md ${isMe ? 'order-1' : 'order-2'} ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                          <div className={`rounded-lg px-3 sm:px-4 py-2 ${
                            isMe 
                              ? 'bg-[#FF9800] text-white shadow-md' 
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
                          }`}>
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words text-wrap-long">{message.message}</p>
                            
                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-1.5 sm:mt-2 space-y-1">
                                {message.attachments.map((attachment, i) => (
                                  <a
                                    key={i}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded min-h-[36px] ${
                                      isMe
                                        ? 'bg-[#FF9800] hover:bg-[#F57C00]'
                                        : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
                                    } transition-colors`}
                                  >
                                    {attachment.type.startsWith('image/') ? (
                                      <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" aria-label="صورة" />
                                    ) : (
                                      <File className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" aria-label="ملف" />
                                    )}
                                    <span className="text-[10px] sm:text-xs truncate flex-1">
                                      {attachment.name}
                                    </span>
                                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                              <>
                                <span>
                                  {message.createdAt ? format(new Date(message.createdAt), 'HH:mm', { locale: enUS }) : '--:--'}
                                </span>
                                {getMessageStatus(message)}
                              </>
                            )}
                            {isMe && (
                              <>
                                {getMessageStatus(message)}
                                <span>
                                  {message.createdAt ? format(new Date(message.createdAt), 'HH:mm', { locale: enUS }) : '--:--'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">لا توجد رسائل في هذه المحادثة</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - الأدمن يحتاج messages.reply أو messages.moderate للإرسال */}
            {currentChat.status === 'active' && (user?.role !== 'admin' || hasPermission(user, PERMISSIONS.MESSAGES_REPLY) || hasPermission(user, PERMISSIONS.MESSAGES_MODERATE)) ? (
              <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-2 sm:p-4 safe-area-bottom">
                <div className="flex items-end gap-1.5 sm:gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 sm:p-2 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                  >
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      // Handle file upload
                    }}
                  />
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 input-field resize-none text-sm sm:text-base min-h-[44px] max-h-[120px]"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="btn-primary p-1.5 sm:p-2 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
                  >
                    {sending ? (
                      <div className="loading-spinner w-4 h-4 sm:w-5 sm:h-5"></div>
                    ) : (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : currentChat.status === 'active' && user?.role === 'admin' && !hasPermission(user, PERMISSIONS.MESSAGES_REPLY) && !hasPermission(user, PERMISSIONS.MESSAGES_MODERATE) ? (
              <div className="bg-gray-800/50 border-t border-slate-700 p-3 sm:p-4 safe-area-bottom">
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">يتطلب صلاحية الرد على الرسائل للإرسال</span>
                </div>
              </div>
            ) : currentChat.status !== 'active' ? (
              <div className="bg-yellow-900/20 border-t border-yellow-800 p-3 sm:p-4 safe-area-bottom">
                <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-200">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">هذه المحادثة مغلقة</span>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-1.5 sm:mb-2">
                اختر محادثة للبدء
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
                اختر محادثة من القائمة أو ابدأ محادثة جديدة
              </p>
              {(user?.role !== 'admin' || hasPermission(user, PERMISSIONS.MESSAGES_REPLY) || hasPermission(user, PERMISSIONS.MESSAGES_MODERATE)) && (
              <button
                onClick={() => setShowNewChat(true)}
                className="btn-primary min-h-[44px] text-sm sm:text-base px-4 sm:px-6"
              >
                بدء محادثة جديدة
              </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 safe-area-inset">
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto mobile-modal-content">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                بدء محادثة جديدة
              </h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setNewChatForm({ subject: '', message: '', category: 'general' });
                }}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  الموضوع <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChatForm.subject}
                  onChange={(e) => setNewChatForm({ ...newChatForm, subject: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                  placeholder="موضوع المحادثة"
                />
              </div>

              {user?.role === 'admin' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    المستخدم المستلم
                  </label>
                  <select
                    value={newChatForm.recipientId || ''}
                    onChange={(e) => setNewChatForm({ ...newChatForm, recipientId: e.target.value })}
                    className="input-field text-sm sm:text-base min-h-[44px]"
                  >
                    <option value="">اختر المستخدم (اختياري)</option>
                    {users.map((userItem) => (
                      <option key={userItem._id} value={userItem._id}>
                        {userItem.name} ({getRoleLabel(userItem.role)}) - {userItem.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  الفئة
                </label>
                <select
                  value={newChatForm.category}
                  onChange={(e) => setNewChatForm({ ...newChatForm, category: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[44px]"
                >
                  <option value="general">عام</option>
                  <option value="support">دعم فني</option>
                  <option value="sales">مبيعات</option>
                  <option value="complaint">شكوى</option>
                  <option value="suggestion">اقتراح</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  الرسالة <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newChatForm.message}
                  onChange={(e) => setNewChatForm({ ...newChatForm, message: e.target.value })}
                  className="input-field text-sm sm:text-base min-h-[88px]"
                  rows={4}
                  placeholder="اكتب رسالتك..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={handleCreateChat}
                  disabled={!newChatForm.subject || !newChatForm.message || sending}
                  className="btn-primary flex-1 min-h-[44px] text-sm sm:text-base"
                >
                  {sending ? (
                    <>
                      <div className="loading-spinner w-4 h-4 ml-1.5 sm:ml-2"></div>
                      جاري الإنشاء...
                    </>
                  ) : (
                    'بدء المحادثة'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowNewChat(false);
                    setNewChatForm({ subject: '', message: '', category: 'general' });
                  }}
                  className="btn-secondary flex-1 min-h-[44px] text-sm sm:text-base"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 