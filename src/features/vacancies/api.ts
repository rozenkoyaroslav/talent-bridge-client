import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http';
import { buildListParams, type ListQuery } from '@/shared/api/query-params';
import { toPaginated, type Paginated } from '@/shared/api/paginated';
import { queryKeys } from '@/shared/api/query-keys';
import type { Status, StudentVacancyResponse, Vacancy, WorkType } from '@/entities/types';

export type VacancyWithEmployer = Vacancy & {
  createdBy: { id: string; companyName: string; user: { id: string } | null } | null;
};

export const useVacancies = (query: ListQuery) =>
  useQuery({
    queryKey: queryKeys.vacancies(query),
    queryFn: async (): Promise<Paginated<VacancyWithEmployer>> =>
      toPaginated<VacancyWithEmployer>(await api.get('/vacancy', buildListParams(query)), 'vacancies'),
    placeholderData: previous => previous,
  });

export const useMyVacancies = () =>
  useQuery({
    queryKey: queryKeys.myVacancies,
    queryFn: () => api.get<VacancyWithEmployer[]>('/vacancy/my-vacancies'),
  });

const invalidateVacancies = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ['vacancies'] });
};

export const useCreateVacancy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      specialization: string;
      candidateStatus: string;
      company: string;
      location: string;
      description: string;
    }) => api.post<Vacancy>('/vacancy', input),
    onSuccess: () => invalidateVacancies(queryClient),
  });
};

export const useUpdateVacancy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Record<string, unknown>) =>
      api.patch<Vacancy>(`/vacancy/${id}`, input),
    onSuccess: () => invalidateVacancies(queryClient),
  });
};

export const useDeleteVacancy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/vacancy/${id}`),
    onSuccess: () => invalidateVacancies(queryClient),
  });
};

export const useChangeVacancyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { vacancyId: string; status: Status }) =>
      api.patch('/vacancy/change-status', input),
    onSuccess: () => invalidateVacancies(queryClient),
  });
};

// --- responses -------------------------------------------------------------

export type ResponseWithRelations = StudentVacancyResponse & {
  vacancy: VacancyWithEmployer | null;
};

export const useRespondToVacancy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { vacancyId: string; workType: WorkType; message?: string }) =>
      api.post('/student-vacancy-response', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['responses'] });
      // Responding opens a conversation, so the chat list is stale too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      invalidateVacancies(queryClient);
    },
  });
};

export const useMyResponses = (query: ListQuery) =>
  useQuery({
    queryKey: queryKeys.myResponses(query),
    queryFn: async (): Promise<Paginated<ResponseWithRelations>> =>
      toPaginated<ResponseWithRelations>(
        await api.get('/student-vacancy-response/my-responses', buildListParams(query)),
        'responses',
      ),
  });

export const useReceivedResponses = (query: ListQuery) =>
  useQuery({
    queryKey: queryKeys.receivedResponses(query),
    queryFn: async (): Promise<Paginated<ResponseWithRelations>> =>
      toPaginated<ResponseWithRelations>(
        await api.get('/student-vacancy-response/received', buildListParams(query)),
        'responses',
      ),
  });

export const useUpdateResponseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { studentId: string; vacancyId: string; statusByEmployer: Status }) =>
      api.patch('/student-vacancy-response/status', input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['responses'] }),
  });
};
