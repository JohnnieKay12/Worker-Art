import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Message, Conversation } from '@/types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Record<string, { user: any; isTyping: boolean }>;
  
  // Actions
  connect: (token: string) => void;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, messageType?: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  markAsRead: (conversationId: string) => void;
  setOnlineUsers: (users: Set<string>) => void;
  setTypingUser: (conversationId: string, user: any, isTyping: boolean) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: {},

  connect: (token: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ isConnected: false });
    });

    socket.on('user_online', ({ userId }) => {
      set((state) => ({
        onlineUsers: new Set([...state.onlineUsers, userId]),
      }));
    });

    socket.on('user_offline', ({ userId }) => {
      set((state) => {
        const newOnlineUsers = new Set(state.onlineUsers);
        newOnlineUsers.delete(userId);
        return { onlineUsers: newOnlineUsers };
      });
    });

    socket.on('user_typing', ({ conversationId, user, isTyping }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: { user, isTyping },
        },
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinConversation: (conversationId: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  },

  leaveConversation: (conversationId: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  },

  sendMessage: (conversationId: string, content: string, messageType = 'text') => {
    const socket = get().socket;
    if (socket) {
      socket.emit('send_message', {
        conversationId,
        content,
        messageType,
      });
    }
  },

  sendTyping: (conversationId: string, isTyping: boolean) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('typing', { conversationId, isTyping });
    }
  },

  markAsRead: (conversationId: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('mark_read', { conversationId });
    }
  },

  setOnlineUsers: (users: Set<string>) => {
    set({ onlineUsers: users });
  },

  setTypingUser: (conversationId: string, user: any, isTyping: boolean) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: { user, isTyping },
      },
    }));
  },
}));
