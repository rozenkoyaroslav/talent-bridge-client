import { useState } from 'react';
import { useMyResponses } from '@/features/vacancies/api';
import { Card, PageHeader, StatusBadge } from '@/shared/ui';
import { ListShell } from '@/shared/ui/list-shell';
import { formatDate, humanize } from '@/shared/lib/format';

export const MyResponsesPage = () => {
  const [page, setPage] = useState(1);
  const query = useMyResponses({ pagination: { page, limit: 10 } });

  return (
    <>
      <PageHeader
        title="My responses"
        description="Applications you sent, and where the employer took them."
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="You have not responded to any vacancy yet"
        emptyDescription="Open the vacancies list and send your first application."
      >
        {items => (
          <div className="space-y-3">
            {items.map(response => (
              <Card
                key={`${response.studentId}-${response.vacancyId}`}
                className="flex flex-wrap items-center justify-between gap-3 p-5"
              >
                <div className="min-w-0">
                  <h2 className="font-medium text-slate-900">
                    {response.vacancy?.specialization?.title ?? 'Vacancy'} ·{' '}
                    {response.vacancy?.company ?? 'Unknown company'}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {humanize(response.workType)} · sent {formatDate(response.createdAt)}
                    {response.vacancy?.location ? ` · ${humanize(response.vacancy.location)}` : ''}
                  </p>
                </div>
                <StatusBadge status={response.statusByEmployer} />
              </Card>
            ))}
          </div>
        )}
      </ListShell>
    </>
  );
};
