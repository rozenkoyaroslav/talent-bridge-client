import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReceivedResponses, useUpdateResponseStatus } from '@/features/vacancies/api';
import { Avatar, Button, Card, PageHeader, StatusBadge } from '@/shared/ui';
import { ListShell } from '@/shared/ui/list-shell';
import { Status } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

export const ReceivedResponsesPage = () => {
  const [page, setPage] = useState(1);
  const query = useReceivedResponses({ pagination: { page, limit: 10 } });
  const updateStatus = useUpdateResponseStatus();

  return (
    <>
      <PageHeader
        title="Responses"
        description="Students who applied to your vacancies."
      />

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="No responses yet"
        emptyDescription="Once a vacancy is approved, student applications land here."
      >
        {items => (
          <div className="space-y-3">
            {items.map(response => {
              const student = (response as { student?: { user?: { id: string; firstName: string; lastName: string; profileImage: string | null } } }).student;

              return (
                <Card
                  key={`${response.studentId}-${response.vacancyId}`}
                  className="flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={student?.user?.profileImage}
                      firstName={student?.user?.firstName}
                      lastName={student?.user?.lastName}
                    />
                    <div className="min-w-0">
                      {student?.user ? (
                        <Link
                          to={`/candidates/${student.user.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {student.user.firstName} {student.user.lastName}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-900">Candidate</span>
                      )}
                      <p className="truncate text-sm text-slate-500">
                        {response.vacancy?.specialization?.title ?? 'Vacancy'} ·{' '}
                        {humanize(response.workType)} · {formatDate(response.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={response.statusByEmployer} />

                    {response.statusByEmployer === Status.PENDING && (
                      <>
                        <Button
                          size="sm"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            void updateStatus.mutateAsync({
                              studentId: response.studentId,
                              vacancyId: response.vacancyId,
                              statusByEmployer: Status.APPROVED,
                            })
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            void updateStatus.mutateAsync({
                              studentId: response.studentId,
                              vacancyId: response.vacancyId,
                              statusByEmployer: Status.REJECTED,
                            })
                          }
                        >
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ListShell>
    </>
  );
};
