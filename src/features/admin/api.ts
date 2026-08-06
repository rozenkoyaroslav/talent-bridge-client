import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { buildListParams, type ListQuery } from '@/shared/api/query-params';
import { toPaginated, type Paginated } from '@/shared/api/paginated';
import { queryKeys } from '@/shared/api/query-keys';
import type { EmployerAnalyticsRow, Role, Status, User, UserAnalytics } from '@/entities/types';

export const useUsers = (query: ListQuery) =>
  useQuery({
    queryKey: queryKeys.users(query),
    queryFn: async (): Promise<Paginated<User>> =>
      toPaginated<User>(await api.get('/user', buildListParams(query)), 'users'),
    placeholderData: previous => previous,
  });

export const useChangeUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { userId: string; status: Status }) => api.patch('/user/change-status', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      // Approving a user creates their chat with the admins.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
};

export const useUserAnalytics = () =>
  useQuery({
    queryKey: queryKeys.userAnalytics,
    queryFn: () => api.get<UserAnalytics>('/user/analytics/counts'),
  });

export type MonthlyPoint = { month: string; total: number };

/**
 * The endpoint returns the raw users in the period rather than per-month totals, so
 * the buckets are built here. Worth moving into the API if this list ever grows.
 */
export const useMonthlyRegistrations = (year: number, role?: Role) =>
  useQuery({
    queryKey: queryKeys.monthlyAnalytics(year, role),
    queryFn: async (): Promise<MonthlyPoint[]> => {
      const params = buildListParams({ pagination: { page: 1, limit: 1000 } });
      params.set('year', String(year));
      if (role) params.set('role', role);

      const response = await api.get<{ data?: User[] }>('/user/analytics/monthly', params);
      const buckets = new Map<string, number>();

      for (let month = 0; month < 12; month++) {
        buckets.set(new Date(year, month, 1).toLocaleString('en', { month: 'short' }), 0);
      }

      (response.data ?? []).forEach(user => {
        const key = new Date(user.createdAt).toLocaleString('en', { month: 'short' });
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });

      return [...buckets].map(([month, total]) => ({ month, total }));
    },
  });

export const useEmployerAnalytics = (query: ListQuery) =>
  useQuery({
    queryKey: queryKeys.employerAnalytics(query),
    queryFn: async (): Promise<Paginated<EmployerAnalyticsRow>> =>
      toPaginated<EmployerAnalyticsRow>(
        await api.get('/user/employer/analytics', buildListParams(query)),
        'data',
      ),
    placeholderData: previous => previous,
  });
