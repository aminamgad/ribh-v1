'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useDataCache } from '@/components/hooks/useDataCache';
import { 
  MessageSquare, 
  Send, 
  User, 
  Package, 
  Calendar,
  Search,
  Filter,
  X,
  Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
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
  subject: string;
  content: string;
  isRead: boolean;
  isApproved: boolean;
  createdAt: string;
}

interface Conversation {
  _id: string;
  lastMessage: Message;
  unreadCount: number;
  otherUser: {
    _id: string;
    name: string;
    role: string;
  };
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageNotification, setNewMessageNotification] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(true);

  // Use cache hook for conversations (initial load only, polling will refresh)
  const { data: conversationsData, loading, refresh } = useDataCache<{
    conversations: Conversation[];
  }>({
    key: 'messages_conversations',
    fetchFn: async () => {
      const response = await fetch('/api/messages/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    },
    enabled: !!user,
    forceRefresh: false
  });

  const conversations = conversationsData?.conversations || [];

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refresh();
    };

    window.addEventListener('refresh-messages', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-messages', handleRefresh);
    };
  }, [refresh]);

  // Keep fetchConversations for backward compatibility and polling
  const fetchConversations = useCallback(async () => {
    refresh();
  }, [refresh]);

  const fetchMessages = useCallback(async () => {
    if (!selectedConversation) return;

    try {
      const otherUserId = selectedConversation.otherUser._id;
      const conversationId = [user?._id, otherUserId].sort().join('-');
      
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark messages as read
        await fetch(`/api/messages/conversations/${conversationId}/read`, {
          method: 'POST'
        });
        
        // Refresh conversations to update unread count
        fetchConversations();
      } else {
        const errorData = await response.json();
        toast.error('فشل في جلب الرسائل');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب الرسائل');
    }
  }, [selectedConversation, user?._id, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      
      // Poll for new messages every 5 seconds when conversation is selected
      const interval = setInterval(() => {
        fetchMessages();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedConversation, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedConversation.otherUser._id,
          subject: `رد على: ${selectedConversation.lastMessage.subject}`,
          content: newMessage,
          productId: selectedConversation.lastMessage.productId?._id
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        await fetchConversations(); // Refresh conversations to update last message
        toast.success('تم إرسال الرسالة بنجاح');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'فشل في إرسال الرسالة');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">جاري تحميل الرسائل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4 space-x-reverse">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">الرسائل</h1>
          </div>
          {selectedConversation && (
            <button
              onClick={() => {
                setSelectedConversation(null);
                setShowConversations(true);
              }}
              className="lg:hidden btn-secondary min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5" />
              <span className="hidden sm:inline">رجوع</span>
            </button>
          )}
        </div>

        {/* New Message Notification */}
        {newMessageNotification && (
          <div className="mb-4 sm:mb-6 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 border border-[#FF9800]/20 dark:border-[#FF9800]/30 rounded-lg p-2.5 sm:p-3 flex items-center">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9800] dark:text-[#FF9800] ml-2 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-[#E65100] dark:text-[#FF9800]">{newMessageNotification}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col ${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}>
            {/* Search */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث في الرسائل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد محادثات بعد'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setShowConversations(false);
                    }}
                    className={`p-3 sm:p-4 border-b border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors active:scale-[0.98] min-h-[80px] sm:min-h-[100px] ${
                      selectedConversation?._id === conversation._id
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-r-4 border-r-primary-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse flex-1 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
                            {conversation.otherUser.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                            {conversation.otherUser.role === 'marketer' ? 'مسوق' : 'تاجر'}
                          </p>
                        </div>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-[20px] text-center flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mb-1 line-clamp-1">
                      {conversation.lastMessage.subject}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 line-clamp-2 text-wrap-long">
                      {conversation.lastMessage.content}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-1.5 sm:mt-2">
                      {new Date(conversation.lastMessage.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className={`lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col ${
            !selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse flex-1 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
                          {selectedConversation.otherUser.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                          {selectedConversation.otherUser.role === 'marketer' ? 'مسوق' : 'تاجر'}
                        </p>
                      </div>
                    </div>
                    {selectedConversation.lastMessage.productId && (
                      <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse text-xs sm:text-sm text-gray-600 dark:text-slate-400 flex-shrink-0 mr-2 sm:mr-0">
                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline truncate max-w-[150px]">{selectedConversation.lastMessage.productId.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                        لا توجد رسائل بعد. ابدأ المحادثة الآن!
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.senderId._id === user?._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl ${
                            message.senderId._id === user?._id
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                          }`}
                        >
                          <p className="text-xs sm:text-sm break-words text-wrap-long">{message.content}</p>
                          <p className={`text-[10px] sm:text-xs mt-1 ${
                            message.senderId._id === user?._id
                              ? 'text-primary-100'
                              : 'text-gray-500 dark:text-slate-400'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 safe-area-bottom">
                  <div className="flex space-x-2 sm:space-x-3 space-x-reverse">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="اكتب ردك هنا..."
                      className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 min-h-[44px]"
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-3 sm:px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                      ) : (
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    اختر محادثة
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
                    اختر محادثة من القائمة لعرض الرسائل والرد عليها
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 