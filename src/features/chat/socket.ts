import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/shared/api/http';
import { IS_MOCK_MODE } from '@/mocks/browser';
import type { Message } from '@/entities/types';

/**
 * Socket.IO is not HTTP, so MSW cannot intercept it. Everything that talks to the
 * chat goes through this interface instead, and the mock mode swaps in an emulator
 * with the same surface — which is why no component ever calls `io()` directly.
 */
export type ChatSocket = {
  onMessage(listener: (message: Message) => void): () => void;
  onTyping(listener: (chatId: string) => void): () => void;
  send(chatId: string, content: string): void;
  disconnect(): void;
};

const createRealSocket = (token: string): ChatSocket => {
  const socket: Socket = io(`${API_URL}/chat`, {
    auth: { token: `Bearer ${token}` },
    transports: ['websocket'],
  });

  return {
    onMessage(listener) {
      socket.on('newMessage', listener);
      return () => socket.off('newMessage', listener);
    },
    onTyping() {
      // The API has no typing event; the emulator provides one for the demo only.
      return () => {};
    },
    send(chatId, content) {
      socket.emit('sendMessage', { chatId, content });
    },
    disconnect() {
      socket.disconnect();
    },
  };
};

const createMockSocket = async (userId: string): Promise<ChatSocket> => {
  const { appendMessage, onMockMessage } = await import('@/mocks/handlers/chat');
  const { db } = await import('@/mocks/db');

  const typingListeners = new Set<(chatId: string) => void>();
  const timers: ReturnType<typeof setTimeout>[] = [];

  const replies = [
    'Thanks for reaching out — that sounds interesting.',
    'Could you tell me a bit more about the schedule?',
    'Great, I will take a look and get back to you today.',
    'That works for me. When can we start?',
    'Noted, thank you for the update.',
  ];

  return {
    onMessage(listener) {
      return onMockMessage(listener);
    },

    onTyping(listener) {
      typingListeners.add(listener);
      return () => typingListeners.delete(listener);
    },

    send(chatId, content) {
      appendMessage(chatId, userId, content);

      // The other participant answers after a beat, so the chat feels alive in a
      // demo where nobody is on the other end.
      const chat = db.chats.find(item => item.id === chatId);
      const partnerId = chat?.participantIds.find(id => id !== userId);
      if (!partnerId) return;

      typingListeners.forEach(listener => listener(chatId));

      timers.push(
        setTimeout(
          () => appendMessage(chatId, partnerId, replies[Math.floor(Math.random() * replies.length)]),
          400 + Math.random() * 500,
        ),
      );
    },

    disconnect() {
      timers.forEach(clearTimeout);
      typingListeners.clear();
    },
  };
};

export const createChatSocket = (token: string, userId: string): Promise<ChatSocket> =>
  IS_MOCK_MODE ? createMockSocket(userId) : Promise.resolve(createRealSocket(token));
