import { useState } from 'react';
import { useChangeVacancyStatus, useVacancies } from '@/features/vacancies/api';
import { compactFilters } from '@/shared/api/query-params';
import { Button, Card, Field, PageHeader, Select, StatusBadge } from '@/shared/ui';
import { FilterBar, ListShell } from '@/shared/ui/list-shell';
import { Status } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

export const AdminVacanciesPage = () => {
  const [status, setStatus] = useState<string>(Status.PENDING);
  const [page, setPage] = useState(1);

  const changeStatus = useChangeVacancyStatus();
  const query = useVacancies({
    filters: compactFilters([status ? { field: 'status', value: status } : null]),
    sorting: { field: 'createdAt', direction: 'desc' },
    pagination: { page, limit: 15 },
  });

  return (
    <>
      <PageHeader
        title="Vacancies"
        description="Approving a vacancy publishes it and queues a digest for students in that specialization."
      />

      <FilterBar>
        <Field label="Status">
          <Select
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
            {Object.values(Status).map(value => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      <ListShell query={query} onPageChange={setPage} emptyTitle="Nothing to moderate">
        {items => (
          <Card className="divide-y divide-slate-100">
            {items.map(vacancy => (
              <div key={vacancy.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {vacancy.specialization?.title ?? 'Vacancy'} · {vacancy.company}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {humanize(vacancy.location)} · for{' '}
                    {humanize(vacancy.candidateStatus).toLowerCase()}s · created{' '}
                    {formatDate(vacancy.createdAt)}
                  </p>
                </div>

                <StatusBadge status={vacancy.status} />

                {vacancy.status !== Status.APPROVED && (
                  <Button
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() =>
                      void changeStatus.mutateAsync({ vacancyId: vacancy.id, status: Status.APPROVED })
                    }
                  >
                    Approve
                  </Button>
                )}
                {vacancy.status !== Status.REJECTED && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={changeStatus.isPending}
                    onClick={() =>
                      void changeStatus.mutateAsync({ vacancyId: vacancy.id, status: Status.REJECTED })
                    }
                  >
                    Reject
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
      </ListShell>
    </>
  );
};
