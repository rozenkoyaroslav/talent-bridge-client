import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { buildListParams } from '@/shared/api/query-params';
import { queryKeys } from '@/shared/api/query-keys';
import type { Chat, Message } from '@/entities/types';

export const useChats = (search?: string) =>
  useQuery({
    queryKey: [...queryKeys.chats, search ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await api.get<{ chats: Chat[] }>(
        search ? '/chat/search-my' : '/chat/my',
        search ? params : undefined,
      );

      return response.chats ?? [];
    },
  });

export const useMessages = (chatId?: string) =>
  useQuery({
    queryKey: queryKeys.messages(chatId ?? ''),
    queryFn: async () => {
      const response = await api.get<{ messages: Message[] }>(
        '/message/by-chat-id',
        (() => {
          const params = buildListParams({ pagination: { page: 1, limit: 100 } });
          params.set('chatId', chatId!);
          return params;
        })(),
      );

      // The API returns newest first; the window reads oldest to newest.
      return [...(response.messages ?? [])].reverse();
    },
    enabled: Boolean(chatId),
  });

export const useSendFile = (chatId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);

      return api.post<Message>(`/message/send-file/${chatId}`, form);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(chatId ?? '') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
};

export const FILE_PREFIX = 'FILE::';

/** Chat attachments travel as a message whose content is `FILE::<url>`. */
export const parseFileMessage = (content: string) =>
  content.startsWith(FILE_PREFIX) ? content.slice(FILE_PREFIX.length) : null;
