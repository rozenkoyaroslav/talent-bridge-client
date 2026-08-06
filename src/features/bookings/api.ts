import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { buildListParams, type ListQuery } from '@/shared/api/query-params';
import { toPaginated, type Paginated } from '@/shared/api/paginated';
import { queryKeys } from '@/shared/api/query-keys';
import type { StudentBooking, Status, WorkType } from '@/entities/types';
import type { VacancyWithEmployer } from '@/features/vacancies/api';

export type BookingWithRelations = StudentBooking & { vacancy: VacancyWithEmployer | null };

const SCOPE_PATHS = {
  employer: '/student-booking/my',
  employerHistory: '/student-booking/my-history',
  // The API builds this path from two constants without a separator; the client
  // has to match it exactly rather than "fix" it here.
  student: '/student-bookingstudent/my',
  admin: '/student-booking',
} as const;

export type BookingScope = keyof typeof SCOPE_PATHS;

export const useBookings = (scope: BookingScope, query: ListQuery) =>
  useQuery({
    queryKey: queryKeys.bookings(scope, query),
    queryFn: async (): Promise<Paginated<BookingWithRelations>> =>
      toPaginated<BookingWithRelations>(
        await api.get(SCOPE_PATHS[scope], buildListParams(query)),
        'bookings',
      ),
    placeholderData: previous => previous,
  });

const invalidateBookings = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ['bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['students'] });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      studentId: string;
      vacancyId: string;
      workType: WorkType;
      message?: string;
    }) => api.post('/student-booking', input),
    onSuccess: () => {
      invalidateBookings(queryClient);
      // Booking opens the conversation with the candidate.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
    },
  });
};

type StatusInput = { studentId: string; vacancyId: string; status: Status };

export const useChangeBookingStatus = (by: 'admin' | 'employer' | 'student') => {
  const queryClient = useQueryClient();

  const path =
    by === 'admin'
      ? '/student-booking/change-status'
      : by === 'employer'
        ? '/student-booking/status-by-employer'
        : '/student-booking/status-by-student';

  return useMutation({
    mutationFn: (input: StatusInput) => api.patch(path, input),
    onSuccess: () => invalidateBookings(queryClient),
  });
};
