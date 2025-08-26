'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageNotification, setNewMessageNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    
    // Poll for new conversations every 10 seconds
    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      
      // Poll for new messages every 5 seconds when conversation is selected
      const interval = setInterval(() => {
        fetchMessages();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      console.log('🔍 Frontend: Fetching conversations for user:', user?._id);
      const response = await fetch('/api/messages/conversations');
      console.log('🔍 Frontend: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Frontend: Received data:', data);
        
        const previousUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        const newUnreadCount = data.conversations.reduce((sum: number, conv: any) => sum + conv.unreadCount, 0);
        
        // Show notification if new messages arrived
        if (newUnreadCount > previousUnreadCount && previousUnreadCount > 0) {
          const newMessagesCount = newUnreadCount - previousUnreadCount;
          setNewMessageNotification(`رسائل جديدة: ${newMessagesCount}`);
          setTimeout(() => setNewMessageNotification(null), 3000);
          
          toast.success(`رسائل جديدة: ${newMessagesCount}`, {
            duration: 3000
          });
        }
        
        setConversations(data.conversations || []);
        console.log('🔍 Frontend: Set conversations:', data.conversations?.length || 0);
      } else {
        const errorData = await response.json();
        console.error('🔍 Frontend: Error response:', errorData);
        toast.error('فشل في جلب المحادثات');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('حدث خطأ أثناء جلب المحادثات');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      const otherUserId = selectedConversation.otherUser._id;
      const conversationId = [user?._id, otherUserId].sort().join('-');
      
      console.log('🔍 Frontend: Fetching messages for conversation:', conversationId);
      console.log('🔍 Frontend: User ID:', user?._id);
      console.log('🔍 Frontend: Other user ID:', otherUserId);
      
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      console.log('🔍 Frontend: Messages response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Frontend: Messages data:', data);
        setMessages(data.messages || []);
        
        // Mark messages as read
        await fetch(`/api/messages/conversations/${conversationId}/read`, {
          method: 'POST'
        });
        
        // Refresh conversations to update unread count
        fetchConversations();
      } else {
        const errorData = await response.json();
        console.error('🔍 Frontend: Messages error:', errorData);
        toast.error('فشل في جلب الرسائل');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('حدث خطأ أثناء جلب الرسائل');
    }
  };

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
      console.error('Error sending message:', error);
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <MessageSquare className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">الرسائل</h1>
          </div>
        </div>

        {/* New Message Notification */}
        {newMessageNotification && (
          <div className="mb-6 bg-[#FF9800]/10 dark:bg-[#FF9800]/20 border border-[#FF9800]/20 dark:border-[#FF9800]/30 rounded-lg p-3 flex items-center">
            <Bell className="w-5 h-5 text-[#FF9800] dark:text-[#FF9800] ml-2" />
            <span className="text-[#E65100] dark:text-[#FF9800]">{newMessageNotification}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث في الرسائل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">
                    {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد محادثات بعد'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 border-b border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                      selectedConversation?._id === conversation._id
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-r-4 border-r-primary-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                            {conversation.otherUser.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {conversation.otherUser.role === 'marketer' ? 'مسوق' : 'تاجر'}
                          </p>
                        </div>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-1 line-clamp-1">
                      {conversation.lastMessage.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                      {conversation.lastMessage.content}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                      {new Date(conversation.lastMessage.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#FF9800] to-[#F57C00] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                          {selectedConversation.otherUser.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {selectedConversation.otherUser.role === 'marketer' ? 'مسوق' : 'تاجر'}
                        </p>
                      </div>
                    </div>
                    {selectedConversation.lastMessage.productId && (
                      <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600 dark:text-slate-400">
                        <Package className="w-4 h-4" />
                        <span>{selectedConversation.lastMessage.productId.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-slate-400">
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
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId._id === user?._id
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-slate-100'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
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
                <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex space-x-3 space-x-reverse">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="اكتب ردك هنا..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    اختر محادثة
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
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