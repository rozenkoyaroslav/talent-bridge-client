import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { buildListParams, type ListQuery } from '@/shared/api/query-params';
import { toPaginated, type Paginated } from '@/shared/api/paginated';
import { queryKeys } from '@/shared/api/query-keys';
import type { Specialization, StudentListItem, StudentProfile, Status, User } from '@/entities/types';

export const useSpecializations = () =>
  useQuery({
    queryKey: queryKeys.specializations,
    queryFn: () => api.get<Specialization[]>('/specialization'),
    // A reference list that changes about never — no point refetching it per screen.
    staleTime: 60 * 60 * 1000,
  });

/**
 * `scope` decides which endpoint answers: the employer-facing search hides
 * candidates the caller already engaged with, the admin one shows pending profiles.
 */
export const useStudents = (query: ListQuery, scope: 'employer' | 'admin' = 'employer') =>
  useQuery({
    queryKey: queryKeys.students(query, scope),
    queryFn: async (): Promise<Paginated<StudentListItem>> => {
      const path = scope === 'admin' ? '/user/student/admin/get-many' : '/user/student';
      return toPaginated<StudentListItem>(await api.get(path, buildListParams(query)), 'students');
    },
    placeholderData: previous => previous,
  });

export type FullStudent = User & { studentProfile: StudentProfile | null };

export const useStudent = (userId?: string) =>
  useQuery({
    queryKey: queryKeys.student(userId ?? ''),
    queryFn: () => api.get<FullStudent>(`/user/student/${userId}`),
    enabled: Boolean(userId),
  });

export const useChangeProfileStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { studentId: string; status: Status }) =>
      api.patch('/user/student/change-profile-status', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['student'] });
    },
  });
};
