'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, User, Package, Bell } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Conversation {
  _id: string;
  lastMessage: {
    _id: string;
    subject: string;
    content: string;
    senderId: {
      _id: string;
      name: string;
      role: string;
    };
    receiverId: {
      _id: string;
      name: string;
      role: string;
    };
    isRead: boolean;
    isApproved: boolean;
    createdAt: string;
  };
  unreadCount: number;
  otherUser: {
    _id: string;
    name: string;
    role: string;
  };
  productName?: string;
}

interface Message {
  _id: string;
  subject: string;
  content: string;
  senderId: {
    _id: string;
    name: string;
    role: string;
  };
  receiverId: {
    _id: string;
    name: string;
    role: string;
  };
  productId?: {
    _id: string;
    name: string;
    images: string[];
  };
  isRead: boolean;
  isApproved: boolean;
  adminNotes?: string;
  createdAt: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState({ subject: '', content: '' });
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [users, setUsers] = useState<Array<{_id: string, name: string, email: string, role: string}>>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [newMessageData, setNewMessageData] = useState({ subject: '', content: '' });
  const [newMessageNotification, setNewMessageNotification] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastConversationCountRef = useRef<number>(0);
  const lastMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchConversations();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Poll for new conversations and messages every 3 seconds (very fast updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation);
      }
    }, 3000); // Poll every 3 seconds for real-time updates

    return () => clearInterval(interval);
  }, [selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      lastMessageCountRef.current = messages.length;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        const previousUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        const newUnreadCount = data.conversations.reduce((sum: number, conv: any) => sum + conv.unreadCount, 0);
        
        // Show notification if new messages arrived
        if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
          const newMessagesCount = newUnreadCount - previousUnreadCount;
          setNewMessageNotification(`رسائل جديدة: ${newMessagesCount}`);
          setTimeout(() => setNewMessageNotification(null), 3000);
          
          // Show toast notification
          toast.success(`رسائل جديدة: ${newMessagesCount}`, {
            icon: <Bell className="w-4 h-4" />,
            duration: 3000
          });
        }
        
        // Show notification if new conversations arrived
        if (data.conversations.length > lastConversationCountRef.current && lastConversationCountRef.current > 0) {
          const newConversationsCount = data.conversations.length - lastConversationCountRef.current;
          toast.success(`محادثات جديدة: ${newConversationsCount}`, {
            icon: <MessageSquare className="w-4 h-4" />,
            duration: 3000
          });
        }
        
        setConversations(data.conversations);
        lastConversationCountRef.current = data.conversations.length;
        setLoading(false);
      } else {
        console.error('Failed to fetch conversations:', response.status);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('حدث خطأ أثناء جلب المحادثات');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.filter((u: any) => u._id !== user?._id)); // Exclude current admin
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب المستخدمين');
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const previousMessageCount = messages.length;
        const currentMessageIds = new Set(data.messages.map((msg: Message) => msg._id));
        
        // Check for new messages
        const newMessages = data.messages.filter((msg: Message) => !lastMessageIdsRef.current.has(msg._id));
        
        setMessages(data.messages);
        
        // Update last message IDs
        lastMessageIdsRef.current = currentMessageIds;
        
        // Show notification if new messages arrived in current conversation
        if (newMessages.length > 0) {
          toast.success(`رسائل جديدة في المحادثة: ${newMessages.length}`, {
            icon: <Bell className="w-4 h-4" />,
            duration: 3000
          });
        }
        
        // Mark messages as read
        if (data.messages.length > 0) {
          await fetch(`/api/messages/conversations/${conversationId}/read`, {
            method: 'POST'
          });
          // Refresh conversations to update unread count
          fetchConversations();
        }
      } else {
        console.error('Failed to fetch messages:', response.status);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('حدث خطأ أثناء جلب الرسائل');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedConversation || !newMessage.subject.trim() || !newMessage.content.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setSending(true);
    try {
      const conversation = conversations.find(c => c._id === selectedConversation);
      if (!conversation) return;

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: conversation.otherUser._id,
          subject: newMessage.subject,
          content: newMessage.content,
          productId: conversation.lastMessage.productId?._id
        }),
      });

      if (response.ok) {
        toast.success('تم إرسال الرسالة بنجاح');
        setNewMessage({ subject: '', content: '' });
        
        // Refresh messages and conversations immediately
        await fetchMessages(selectedConversation);
        await fetchConversations();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء إرسال الرسالة');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleSendNewMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !newMessageData.subject.trim() || !newMessageData.content.trim()) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedUser,
          subject: newMessageData.subject,
          content: newMessageData.content,
        }),
      });

      if (response.ok) {
        toast.success('تم إرسال الرسالة بنجاح');
        setNewMessageData({ subject: '', content: '' });
        setSelectedUser('');
        setShowNewMessageForm(false);
        
        // Refresh conversations
        await fetchConversations();
      } else {
        const error = await response.json();
        toast.error(error.message || 'حدث خطأ أثناء إرسال الرسالة');
      }
    } catch (error) {
      console.error('Error sending new message:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setSending(false);
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

  const getStatusIcon = (isApproved: boolean) => {
    if (isApproved) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('ar-EG', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">إدارة المحادثات والرسائل</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">إدارة الرسائل والمحادثات مع المستخدمين</p>
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowNewMessageForm(true)}
            className="btn-primary"
          >
            <Send className="w-5 h-5 ml-2" />
            رسالة جديدة
          </button>
        )}
      </div>

      {/* New Message Notification */}
      {newMessageNotification && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-2" />
          <span className="text-blue-800 dark:text-blue-200">{newMessageNotification}</span>
        </div>
      )}

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations */}
        <div className="lg:col-span-1">
          <div className="card h-[600px] flex flex-col">
            <div className="border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">المحادثات</h2>
            </div>

            {conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">لا توجد محادثات</h3>
                  <p className="text-gray-600 dark:text-slate-400">لم يتم إنشاء أي محادثات بعد</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation._id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conversation._id
                        ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <h3 className="font-medium text-gray-900 dark:text-slate-100">
                            {conversation.otherUser.name}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {getRoleLabel(conversation.otherUser.role)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {conversation.lastMessage.subject}
                        </p>
                        
                        {conversation.productName && (
                          <div className="flex items-center mt-1">
                            <Package className="w-3 h-3 text-gray-400 dark:text-slate-500 ml-1" />
                            <span className="text-xs text-gray-500 dark:text-slate-400">{conversation.productName}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatMessageTime(conversation.lastMessage.createdAt)}
                          </span>
                          
                          <div className="flex items-center space-x-1 space-x-reverse">
                            {getStatusIcon(conversation.lastMessage.isApproved)}
                            {conversation.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          <div className="card h-[600px] flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages Header */}
                <div className="border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {conversations.find(c => c._id === selectedConversation)?.otherUser.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {getRoleLabel(conversations.find(c => c._id === selectedConversation)?.otherUser.role || '')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-slate-400">لا توجد رسائل</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => {
                        // تحويل كل من user._id و message.senderId._id إلى string للمقارنة الصحيحة
                        const currentUserId = user?._id?.toString();
                        const messageSenderId = message.senderId._id?.toString();
                        const isCurrentUserMessage = currentUserId === messageSenderId;
                        
                        // Debug: طباعة معلومات المقارنة
                        console.log('Message Debug:', {
                          messageId: message._id,
                          currentUserId,
                          messageSenderId,
                          isCurrentUserMessage,
                          messageSenderName: message.senderId.name,
                          currentUserName: user?.name
                        });
                        
                        return (
                          <div
                            key={message._id}
                            className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                                isCurrentUserMessage
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                  {message.senderId.name} ({getRoleLabel(message.senderId.role)})
                                </span>
                                <div className="flex items-center space-x-1 space-x-reverse">
                                  {getStatusIcon(message.isApproved)}
                                </div>
                              </div>
                              
                              <h4 className="font-medium mb-1">{message.subject}</h4>
                              <p className="text-sm">{message.content}</p>
                              
                              {message.productId && (
                                <div className="mt-2 p-2 bg-white bg-opacity-20 rounded">
                                  <div className="flex items-center">
                                    {message.productId.images[0] && (
                                      <img
                                        src={message.productId.images[0]}
                                        alt={message.productId.name}
                                        className="w-8 h-8 object-cover rounded ml-2"
                                      />
                                    )}
                                    <span className="text-sm">{message.productId.name}</span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="text-xs mt-2 opacity-75">
                                {formatMessageTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Send Message Form */}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <input
                      type="text"
                      placeholder="موضوع الرسالة"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                      className="input-field"
                      required
                    />
                    
                    <textarea
                      placeholder="محتوى الرسالة"
                      value={newMessage.content}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                      rows={3}
                      className="input-field"
                      required
                    />
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={sending}
                        className="btn-primary"
                      >
                        {sending ? (
                          <>
                            <div className="loading-spinner w-4 h-4 ml-2"></div>
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 ml-2" />
                            إرسال
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">اختر محادثة</h3>
                  <p className="text-gray-600 dark:text-slate-400">اختر محادثة من القائمة لعرض الرسائل</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal for Admin */}
      {showNewMessageForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">رسالة جديدة</h2>
              <button
                onClick={() => {
                  setShowNewMessageForm(false);
                  setNewMessageData({ subject: '', content: '' });
                  setSelectedUser('');
                }}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNewMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  المستخدم المستلم *
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">اختر المستخدم</option>
                  {users.map((userItem) => (
                    <option key={userItem._id} value={userItem._id}>
                      {userItem.name} ({getRoleLabel(userItem.role)}) - {userItem.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  موضوع الرسالة *
                </label>
                <input
                  type="text"
                  value={newMessageData.subject}
                  onChange={(e) => setNewMessageData(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field"
                  placeholder="موضوع الرسالة"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  محتوى الرسالة *
                </label>
                <textarea
                  value={newMessageData.content}
                  onChange={(e) => setNewMessageData(prev => ({ ...prev, content: e.target.value }))}
                  className="input-field"
                  rows={4}
                  placeholder="محتوى الرسالة"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMessageForm(false);
                    setNewMessageData({ subject: '', content: '' });
                    setSelectedUser('');
                  }}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary"
                >
                  {sending ? (
                    <>
                      <div className="loading-spinner w-4 h-4 ml-2"></div>
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      إرسال
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 