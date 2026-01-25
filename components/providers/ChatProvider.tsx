'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import io, { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Chat, ChatMessage, ChatAttachment } from '@/types/chat';
import { logger } from '@/lib/logger';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  loading: boolean;
  totalUnread: number;
  socket: Socket | null;
  fetchChats: () => Promise<void>;
  fetchChat: (chatId: string) => Promise<Chat | null>;
  createChat: (subject: string, message: string, recipientId?: string, category?: string) => Promise<Chat | null>;
  sendMessage: (chatId: string, message: string, type?: string, attachments?: ChatAttachment[]) => Promise<boolean>;
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


  const fetchChats = useCallback(async () => {
    // Only fetch if user is properly authenticated
    if (!user || !isAuthenticated || authLoading) {
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        credentials: 'include' // Ensure cookies are included
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Don't show error toast for auth issues, just clear chats
          setChats([]);
          return;
        }
        throw new Error(`Failed to fetch chats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // تحديث فوري للحالة
        setChats(data.chats || []);
      } else {
        setChats([]);
        // Only show error if it's not an auth issue
        if (!data.message?.includes('تسجيل الدخول')) {
          toast.error(data.message || 'فشل في جلب المحادثات');
        }
      }
    } catch (error) {
      setChats([]);
      // Only show error if it's not a network/auth issue
      const errorMessage = (error as any).message || '';
      if (!errorMessage.includes('401') && !errorMessage.includes('Unauthorized')) {
        toast.error('حدث خطأ في جلب المحادثات');
      }
    }
  }, [user, isAuthenticated, authLoading]);

  const fetchChat = useCallback(async (chatId: string): Promise<Chat | null> => {
    if (!user || !isAuthenticated) {
      return null;
    }

    try {
      logger.debug('Fetching chat', { chatId, userId: user._id });
      
      const response = await fetch(`/api/chat/${chatId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const chat = data.chat;
        
        // تحديث قائمة المحادثات بالمحادثة المحدثة
        setChats(prev => prev.map(c => 
          c._id === chatId ? { ...chat, unreadCount: chat.unreadCount || 0 } : c
        ));
        
        logger.debug('Chat fetched successfully', { 
          chatId, 
          unreadCount: chat.unreadCount 
        });
        return chat;
      } else {
        logger.warn('Failed to fetch chat', { chatId, status: response.status });
        return null;
      }
    } catch (error) {
      logger.error('Error fetching chat', error, { chatId });
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
      toast.error('حدث خطأ في إرسال الرسالة');
      return false;
    }
  }, [user, isAuthenticated, currentChat]);

  const markAsRead = useCallback(async (chatId: string): Promise<void> => {
    if (!user || !isAuthenticated) return;

    try {
      logger.debug('Marking chat as read', { chatId, userId: user._id });
      
      // Update on server first to ensure data consistency
      const response = await fetch(`/api/chat/${chatId}/read`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        logger.error('Failed to mark chat as read', new Error(`HTTP ${response.status}`), { chatId });
        // Refresh chats to get correct state from server
        await fetchChats();
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        // Update locally after successful server update
        setChats(prev => prev.map(chat =>
          chat._id === chatId 
            ? { ...chat, unreadCount: data.unreadCount || 0 } 
            : chat
        ));
        
        // Also update currentChat if it's the same chat
        if (currentChat?._id === chatId) {
          setCurrentChat(prev => prev ? {
            ...prev,
            unreadCount: data.unreadCount || 0,
            messages: prev.messages.map(msg => ({
              ...msg,
              isRead: (msg.senderId as any)?._id !== user._id && (msg.senderId as any) !== user._id ? true : msg.isRead
            }))
          } : null);
        }
        
        logger.debug('Chat marked as read successfully', { 
          chatId, 
          unreadCount: data.unreadCount 
        });
      } else {
        logger.warn('Server returned error when marking chat as read', { chatId, message: data.message });
        // Refresh chats to get correct state
        await fetchChats();
      }
    } catch (error) {
      logger.error('Error marking chat as read', error, { chatId });
      // Refresh chats to get correct state from server
      await fetchChats();
    }
  }, [user, isAuthenticated, fetchChats, currentChat]);

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
  }, [user, isAuthenticated, authLoading, socket]);

  // Fetch chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && user) {
      fetchChats();
    } else {
      setChats([]);
      setCurrentChat(null);
    }
  }, [isAuthenticated, authLoading, user, fetchChats]);

  // تحسين: تحديث مستمر للعداد كل 3 ثوانٍ
  useEffect(() => {
    if (!isAuthenticated || authLoading || !user) return;

    // تحديث فوري عند بدء التطبيق
    fetchChats();
    
    // لا نحدث تلقائياً - نترك المستخدم يتحكم في ذلك
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