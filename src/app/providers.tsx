import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/auth-context';
import { ApiError } from '@/shared/api/http';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Auth and validation failures will not fix themselves on a retry.
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
