import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_PREFIX, API_URL } from '@/shared/api/http';
import { tokenStore } from '@/shared/api/token-store';
import type { StudentProfile } from '@/entities/types';

export const useUpdateStudentProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.patch('/user/student', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useToggleLooking = (kind: 'job' | 'practice') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: boolean) =>
      api.patch<StudentProfile>(`/user/student/looking-for-${kind}/${value}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student'] }),
  });
};

export const useDeleteUpload = (kind: 'resume' | 'interview') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.patch(`/user/student/delete-${kind}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student'] }),
  });
};

/**
 * Uploads go through XHR rather than fetch: `fetch` reports download progress but
 * not upload progress, and a 100 MB video with no progress bar reads as a hang.
 */
export const uploadWithProgress = (
  path: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const request = new XMLHttpRequest();
    request.open('PATCH', `${API_URL}${API_PREFIX}${path}`);
    request.withCredentials = true;

    const token = tokenStore.get();
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);

    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText || '{}'));
        } catch {
          resolve({});
        }
        return;
      }

      let message = 'Upload failed';
      try {
        message = JSON.parse(request.responseText)?.message ?? message;
      } catch {
        // Keep the default message when the body is not JSON.
      }
      reject(new Error(message));
    };

    request.onerror = () => reject(new Error('Network error during upload'));
    request.send(form);
  });

export const UPLOAD_LIMITS = {
  avatar: { path: '/user/upload-avatar', accept: 'image/png,image/jpeg', maxMb: 5 },
  resume: { path: '/user/student/upload-resume', accept: '.pdf,.doc,.docx', maxMb: 10 },
  interview: {
    path: '/user/student/upload-video-interview',
    accept: 'video/mp4,video/quicktime,video/x-msvideo',
    maxMb: 100,
  },
} as const;
