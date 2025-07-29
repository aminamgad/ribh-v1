'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import io, { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface ChatMessage {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  message: string;
  type: string;
  attachments?: any[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface Chat {
  _id: string;
  participants: any[];
  subject: string;
  status: string;
  category?: string;
  priority: string;
  messages: ChatMessage[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  loading: boolean;
  totalUnread: number;
  socket: Socket | null;
  fetchChats: () => Promise<void>;
  fetchChat: (chatId: string) => Promise<Chat | null>;
  createChat: (subject: string, message: string, recipientId?: string, category?: string) => Promise<Chat | null>;
  sendMessage: (chatId: string, message: string, type?: string, attachments?: any[]) => Promise<boolean>;
  markAsRead: (chatId: string) => Promise<void>;
  closeChat: (chatId: string) => Promise<boolean>;
  setCurrentChat: (chat: Chat | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Calculate total unread messages
  const totalUnread = chats.reduce((total, chat) => total + chat.unreadCount, 0);

  // Debug: طباعة قيمة العداد
  console.log('=== CHAT PROVIDER DEBUG ===');
  console.log('chats count:', chats.length);
  console.log('totalUnread:', totalUnread);
  console.log('chats with unread:', chats.filter(chat => chat.unreadCount > 0).map(chat => ({
    id: chat._id,
    subject: chat.subject,
    unreadCount: chat.unreadCount
  })));
  console.log('===========================');

  const fetchChats = useCallback(async () => {
    // Only fetch if user is properly authenticated
    if (!user || !isAuthenticated || authLoading) {
      console.log('Skipping chat fetch: user not authenticated or still loading');
      return;
    }

    try {
      console.log('Fetching chats for user:', user.email);
      
      const response = await fetch('/api/chat', {
        credentials: 'include' // Ensure cookies are included
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Chat fetch failed: Unauthorized. User may need to re-login.');
          // Don't show error toast for auth issues, just clear chats
          setChats([]);
          return;
        }
        throw new Error(`Failed to fetch chats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Chats fetched successfully:', data.chats?.length || 0, 'chats');
        console.log('Chats with unread:', data.chats?.filter((chat: any) => chat.unreadCount > 0).map((chat: any) => ({
          id: chat._id,
          subject: chat.subject,
          unreadCount: chat.unreadCount
        })));
        
        // تحديث فوري للحالة
        setChats(data.chats || []);
        
        // طباعة العداد الجديد
        const newTotalUnread = (data.chats || []).reduce((total: number, chat: any) => total + chat.unreadCount, 0);
        console.log('New total unread count:', newTotalUnread);
      } else {
        console.error('API returned error:', data.message);
        setChats([]);
        // Only show error if it's not an auth issue
        if (!data.message?.includes('تسجيل الدخول')) {
          toast.error(data.message || 'فشل في جلب المحادثات');
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]);
      // Only show error if it's not a network/auth issue
      const errorMessage = error.message || '';
      if (!errorMessage.includes('401') && !errorMessage.includes('Unauthorized')) {
        toast.error('حدث خطأ في جلب المحادثات');
      }
    }
  }, [user, isAuthenticated, authLoading]);

  const fetchChat = useCallback(async (chatId: string): Promise<Chat | null> => {
    if (!user || !isAuthenticated) {
      console.log('Cannot fetch chat: user not authenticated');
      return null;
    }

    try {
      console.log('Fetching chat:', chatId);
      
      const response = await fetch(`/api/chat/${chatId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const chat = data.chat;
        
        // تحسين تحديد الرسائل - إضافة debug
        if (chat.messages) {
          chat.messages.forEach((message: ChatMessage, index: number) => {
            const isMe = message.senderId?._id === user?._id || message.senderId === user?._id;
            console.log(`Message ${index + 1}:`, {
              messageId: message._id,
              senderId: message.senderId?._id || message.senderId,
              userId: user?._id,
              isMe: isMe,
              message: message.message.substring(0, 20) + '...'
            });
          });
        }
        
        // لا نحدث currentChat تلقائياً - نترك المستخدم يتحكم في ذلك
        console.log('Chat fetched successfully, unreadCount:', chat.unreadCount);
        return chat;
      } else {
        console.error('Failed to fetch chat:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      return null;
    }
  }, [user, isAuthenticated]);

  const createChat = useCallback(async (
    subject: string,
    message: string,
    recipientId?: string,
    category?: string
  ): Promise<Chat | null> => {
    if (!user || !isAuthenticated) {
      toast.error('يجب تسجيل الدخول أولاً');
      return null;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject,
          message,
          recipientId,
          category
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newChat = data.chat;
        setChats(prev => [newChat, ...prev]);
        toast.success('تم إنشاء المحادثة بنجاح');
        return newChat;
      } else {
        toast.error(data.message || 'فشل في إنشاء المحادثة');
        return null;
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('حدث خطأ في إنشاء المحادثة');
      return null;
    }
  }, [user, isAuthenticated]);

  const sendMessage = useCallback(async (
    chatId: string,
    message: string,
    type: string = 'text',
    attachments?: any[]
  ): Promise<boolean> => {
    if (!user || !isAuthenticated) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    try {
      // إنشاء رسالة مؤقتة للعرض الفوري
      const tempMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        senderId: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        message,
        type,
        attachments,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      // تحديث currentChat فوراً للعرض المباشر
      if (currentChat?._id === chatId) {
        setCurrentChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, tempMessage],
          lastMessage: message,
          lastMessageAt: new Date().toISOString()
        } : null);
      }

      // تحديث قائمة المحادثات فوراً
      setChats(prev => prev.map(chat => 
        chat._id === chatId ? {
          ...chat,
          lastMessage: message,
          lastMessageAt: new Date().toISOString(),
          // لا نغير unreadCount عند إرسال رسالة
          unreadCount: chat.unreadCount
        } : chat
      ));

      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          type,
          attachments
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // استبدال الرسالة المؤقتة بالرسالة الحقيقية
        if (currentChat?._id === chatId) {
          setCurrentChat(prev => prev ? {
            ...prev,
            messages: prev.messages.map(msg => 
              msg._id === tempMessage._id ? data.message : msg
            )
          } : null);
        }

        // تحديث قائمة المحادثات بالرسالة الحقيقية
        setChats(prev => prev.map(chat => 
          chat._id === chatId ? {
            ...chat,
            messages: chat.messages.map(msg => 
              msg._id === tempMessage._id ? data.message : msg
            )
          } : chat
        ));
        
        return true;
      } else {
        // إزالة الرسالة المؤقتة في حالة الفشل
        if (currentChat?._id === chatId) {
          setCurrentChat(prev => prev ? {
            ...prev,
            messages: prev.messages.filter(msg => msg._id !== tempMessage._id)
          } : null);
        }

        setChats(prev => prev.map(chat => 
          chat._id === chatId ? {
            ...chat,
            messages: chat.messages.filter(msg => msg._id !== tempMessage._id)
          } : chat
        ));

        toast.error(data.message || 'فشل في إرسال الرسالة');
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ في إرسال الرسالة');
      return false;
    }
  }, [user, isAuthenticated, currentChat]);

  const markAsRead = useCallback(async (chatId: string): Promise<void> => {
    if (!user || !isAuthenticated) return;

    try {
      console.log('Marking chat as read:', chatId);
      
      // Update locally first for immediate UI feedback
      setChats(prev => {
        const updatedChats = prev.map(chat =>
          chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
        );
        
        // طباعة العداد الجديد
        const newTotalUnread = updatedChats.reduce((total, chat) => total + chat.unreadCount, 0);
        console.log('Local update - New total unread count:', newTotalUnread);
        
        return updatedChats;
      });

      // Then update on server
      const response = await fetch(`/api/chat/${chatId}/read`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Failed to mark chat as read:', response.status);
        // Revert local change if server update failed
        await fetchChats();
      } else {
        console.log('Chat marked as read successfully on server');
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
      // Revert local change if request failed
      await fetchChats();
    }
  }, [user, isAuthenticated, fetchChats]);

  const closeChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!user || !isAuthenticated) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'closed'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update chats list
        setChats(prev =>
          prev.map(chat =>
            chat._id === chatId ? { ...chat, status: 'closed' } : chat
          )
        );

        // Update current chat if it's the one being closed
        if (currentChat?._id === chatId) {
          setCurrentChat(prev => prev ? { ...prev, status: 'closed' } : null);
        }

        toast.success('تم إغلاق المحادثة');
        return true;
      } else {
        toast.error(data.message || 'فشل في إغلاق المحادثة');
        return false;
      }
    } catch (error) {
      console.error('Error closing chat:', error);
      toast.error('حدث خطأ في إغلاق المحادثة');
      return false;
    }
  }, [user, isAuthenticated, currentChat]);

  // Initialize socket connection for real-time chat
  useEffect(() => {
    if (!user || !isAuthenticated || authLoading) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Socket initialization logic can go here
    // For now, we'll skip it to avoid additional complexity
    console.log('Chat socket initialization skipped for now');
  }, [user, isAuthenticated, authLoading, socket]);

  // Fetch chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && user) {
      console.log('User authenticated, fetching chats...');
      fetchChats();
    } else {
      console.log('User not authenticated or still loading, clearing chats');
      setChats([]);
      setCurrentChat(null);
    }
  }, [isAuthenticated, authLoading, user, fetchChats]);

  // تحسين: تحديث مستمر للعداد كل 3 ثوانٍ
  useEffect(() => {
    if (!isAuthenticated || authLoading || !user) return;

    console.log('Setting up periodic chat updates...');
    
    // تحديث فوري عند بدء التطبيق
    fetchChats();
    
    // لا نحدث تلقائياً - نترك المستخدم يتحكم في ذلك
    // const interval = setInterval(() => {
    //   console.log('Periodic chat fetch...');
    //   fetchChats();
    // }, 3000); // تحديث كل 3 ثوانٍ

    // return () => {
    //   console.log('Clearing chat update interval');
    //   clearInterval(interval);
    // };
  }, [isAuthenticated, authLoading, user, fetchChats]);

  const value = {
    chats,
    currentChat,
    loading,
    totalUnread,
    socket,
    fetchChats,
    fetchChat,
    createChat,
    sendMessage,
    markAsRead,
    closeChat,
    setCurrentChat
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
} 