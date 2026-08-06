import { useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useBookings, useChangeBookingStatus, type BookingScope } from '@/features/bookings/api';
import { Avatar, Badge, Button, Card, Field, PageHeader, Select, StatusBadge } from '@/shared/ui';
import { FilterBar, ListShell } from '@/shared/ui/list-shell';
import { Role, Status } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

/**
 * One screen, three audiences: the row content is the same booking, only the
 * available action differs, so the role picks the endpoint rather than the page.
 */
export const BookingsPage = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const isEmployer = user?.role === Role.EMPLOYER;
  const isStudent = user?.role === Role.STUDENT;
  const scope: BookingScope = isEmployer ? 'employer' : isStudent ? 'student' : 'admin';

  const query = useBookings(scope, {
    filters: status ? [{ field: 'status', value: status }] : [],
    pagination: { page, limit: 10 },
  });

  const changeStatus = useChangeBookingStatus(
    isEmployer ? 'employer' : isStudent ? 'student' : 'admin',
  );

  return (
    <>
      <PageHeader
        title="Bookings"
        description={
          isStudent
            ? 'Employers who booked you for a vacancy. Accepting starts a practice.'
            : isEmployer
              ? 'Candidates you booked. A booking becomes a practice once both sides accept.'
              : 'Every booking on the platform, pending your moderation.'
        }
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

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="No bookings here yet"
        emptyDescription={
          isEmployer ? 'Book a candidate from the candidates list.' : 'Nothing to review right now.'
        }
      >
        {items => (
          <div className="space-y-3">
            {items.map(booking => {
              const student = (booking as { student?: { user?: { firstName: string; lastName: string; profileImage: string | null } } }).student;
              const canAct = booking.status === Status.PENDING;

              return (
                <Card
                  key={`${booking.studentId}-${booking.vacancyId}`}
                  className="flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {!isStudent && (
                      <Avatar
                        src={student?.user?.profileImage}
                        firstName={student?.user?.firstName}
                        lastName={student?.user?.lastName}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {isStudent
                          ? (booking.vacancy?.company ?? 'Employer')
                          : `${student?.user?.firstName ?? ''} ${student?.user?.lastName ?? ''}`.trim() ||
                            'Candidate'}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {booking.vacancy?.specialization?.title ?? 'Vacancy'} ·{' '}
                        {humanize(booking.workType)} · {formatDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>employer: {humanize(booking.statusByEmployer).toLowerCase()}</Badge>
                    <Badge>student: {humanize(booking.statusByStudent).toLowerCase()}</Badge>
                    <StatusBadge status={booking.status} />

                    {canAct && (
                      <>
                        <Button
                          size="sm"
                          disabled={changeStatus.isPending}
                          onClick={() =>
                            void changeStatus.mutateAsync({
                              studentId: booking.studentId,
                              vacancyId: booking.vacancyId,
                              status: Status.APPROVED,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={changeStatus.isPending}
                          onClick={() =>
                            void changeStatus.mutateAsync({
                              studentId: booking.studentId,
                              vacancyId: booking.vacancyId,
                              status: Status.REJECTED,
                            })
                          }
                        >
                          Reject
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
