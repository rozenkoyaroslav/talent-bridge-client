import type { ListQuery } from './query-params';

/**
 * One place for cache keys so an invalidation after a mutation cannot miss a list
 * that happens to be mounted with a different filter combination.
 */
export const queryKeys = {
  specializations: ['specializations'] as const,

  students: (query: ListQuery, scope: 'employer' | 'admin') => ['students', scope, query] as const,
  student: (userId: string) => ['student', userId] as const,

  vacancies: (query: ListQuery) => ['vacancies', query] as const,
  myVacancies: ['vacancies', 'mine'] as const,

  myResponses: (query: ListQuery) => ['responses', 'mine', query] as const,
  receivedResponses: (query: ListQuery) => ['responses', 'received', query] as const,

  bookings: (scope: string, query: ListQuery) => ['bookings', scope, query] as const,

  practices: (scope: 'student' | 'employer') => ['practices', scope] as const,

  chats: ['chats'] as const,
  messages: (chatId: string) => ['messages', chatId] as const,

  notifications: (query: ListQuery) => ['notifications', query] as const,
  unreadCount: ['notifications', 'unread'] as const,

  userAnalytics: ['analytics', 'users'] as const,
  monthlyAnalytics: (year?: number, role?: string) => ['analytics', 'monthly', year, role] as const,
  employerAnalytics: (query: ListQuery) => ['analytics', 'employers', query] as const,
  users: (query: ListQuery) => ['users', query] as const,
};
