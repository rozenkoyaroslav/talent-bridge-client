import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { buildListParams, type ListQuery } from '@/shared/api/query-params';
import { toPaginated, type Paginated } from '@/shared/api/paginated';
import { queryKeys } from '@/shared/api/query-keys';
import type { NotificationItem } from '@/entities/types';

export const useNotifications = (query: ListQuery, enabled = true) =>
  useQuery({
    queryKey: queryKeys.notifications(query),
    queryFn: async (): Promise<Paginated<NotificationItem>> =>
      toPaginated<NotificationItem>(
        await api.get('/user-notification/my', buildListParams(query)),
        'notifications',
      ),
    enabled,
  });

export const useUnreadCount = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api.get<{ total: number }>('/user-notification/total-unread'),
    enabled,
    // No push channel for notifications, so the badge polls at a rate that stays
    // current without being noticeable.
    refetchInterval: 60_000,
  });

export const useMarkRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds?: string[]) =>
      api.patch('/user-notification/read', { notificationIds }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
