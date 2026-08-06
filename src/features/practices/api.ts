import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { queryKeys } from '@/shared/api/query-keys';
import type { StudentProfile, StudentWorkExperience, User } from '@/entities/types';
import type { VacancyWithEmployer } from '@/features/vacancies/api';

export type Practice = StudentWorkExperience & {
  vacancy: VacancyWithEmployer | null;
  student?: (StudentProfile & { user: User }) | null;
};

export const usePractices = (scope: 'student' | 'employer') =>
  useQuery({
    queryKey: queryKeys.practices(scope),
    queryFn: () =>
      api.get<Practice[]>(scope === 'student' ? '/practice-and-work/my' : '/practice-and-work/employer/my'),
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ['practices'] });
  // The candidate list shows an average of completed practice grades.
  void queryClient.invalidateQueries({ queryKey: ['students'] });
};

/** Confirms one side of the start/end handshake; the API flips the status once both agree. */
export const useUpdatePractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Record<string, boolean>>) =>
      api.patch(`/practice-and-work/update/${id}`, input),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useCompletePractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; gradePractice: number; feedback: string }) =>
      api.patch(`/practice-and-work/complete/${id}`, { ...input, approvedEndByEmployer: true }),
    onSuccess: () => invalidate(queryClient),
  });
};
