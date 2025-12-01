/**
 * Chat and Message Type Definitions
 */

import { User } from './index';

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size?: number;
}

export interface ChatParticipant {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface ChatMessage {
  _id: string;
  senderId: ChatParticipant | string;
  message: string;
  type: string;
  attachments?: ChatAttachment[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Chat {
  _id: string;
  participants: ChatParticipant[];
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

