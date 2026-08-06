import type { ReactNode } from 'react';
import { Card, EmptyState, ErrorState, Pagination, Skeleton } from '@/shared/ui';
import type { Paginated } from '@/shared/api/paginated';

/**
 * Every list screen shares the same four states — loading, error, empty, results —
 * plus paging. Writing that per screen is how they end up behaving differently.
 */
export const ListShell = <T,>({
  query,
  onPageChange,
  emptyTitle,
  emptyDescription,
  children,
  skeletonRows = 4,
}: {
  query: {
    data?: Paginated<T>;
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
    refetch: () => void;
  };
  onPageChange: (page: number) => void;
  emptyTitle: string;
  emptyDescription?: string;
  children: (items: T[]) => ReactNode;
  skeletonRows?: number;
}) => {
  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Could not load this list'}
        onRetry={query.refetch}
      />
    );
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  const metadata = query.data!.metadata;

  return (
    <div className="space-y-4">
      {children(items)}
      {metadata.totalPages > 1 && (
        <Card>
          <Pagination
            page={metadata.page}
            totalPages={metadata.totalPages}
            totalItems={metadata.totalItems}
            onChange={onPageChange}
          />
        </Card>
      )}
    </div>
  );
};

export const FilterBar = ({ children }: { children: ReactNode }) => (
  <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">{children}</Card>
);
