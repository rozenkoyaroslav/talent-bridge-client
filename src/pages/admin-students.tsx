import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChangeProfileStatus, useSpecializations, useStudents } from '@/features/candidates/api';
import { compactFilters } from '@/shared/api/query-params';
import { Avatar, Button, Card, Field, PageHeader, Select, StatusBadge } from '@/shared/ui';
import { FilterBar, ListShell } from '@/shared/ui/list-shell';
import { Status } from '@/entities/types';
import { humanize } from '@/shared/lib/format';

export const AdminStudentsPage = () => {
  const [profileStatus, setProfileStatus] = useState<string>(Status.PENDING);
  const [specialization, setSpecialization] = useState('');
  const [page, setPage] = useState(1);

  const specializations = useSpecializations();
  const changeStatus = useChangeProfileStatus();

  const query = useStudents(
    {
      filters: compactFilters([
        profileStatus ? { field: 'profileStatus', value: profileStatus } : null,
        specialization ? { field: 'specialization', value: specialization } : null,
      ]),
      sorting: { field: 'createdAt', direction: 'desc' },
      pagination: { page, limit: 15 },
    },
    'admin',
  );

  return (
    <>
      <PageHeader
        title="Student profiles"
        description="Profiles awaiting review. Editing a profile sends it back to this queue."
      />

      <FilterBar>
        <Field label="Profile status">
          <Select
            value={profileStatus}
            onChange={event => {
              setProfileStatus(event.target.value);
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

        <Field label="Specialization">
          <Select
            value={specialization}
            onChange={event => {
              setSpecialization(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
            {specializations.data?.map(item => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="Nothing to review"
        emptyDescription="No profile matches this filter right now."
      >
        {items => (
          <Card className="divide-y divide-slate-100">
            {items.map(student => (
              <div key={student.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar
                  src={student.user.profileImage}
                  firstName={student.user.firstName}
                  lastName={student.user.lastName}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/candidates/${student.user.id}`}
                    className="truncate font-medium text-slate-900 hover:text-blue-600"
                  >
                    {student.user.firstName} {student.user.lastName}
                  </Link>
                  <p className="truncate text-sm text-slate-500">
                    {student.specialization?.title ?? 'No specialization'}
                    {student.city ? ` · ${humanize(student.city)}` : ''}
                    {student.averageGrade > 0 ? ` · avg ${student.averageGrade.toFixed(1)}` : ''}
                  </p>
                </div>

                <StatusBadge status={student.profileStatus} />

                {student.profileStatus !== Status.APPROVED && (
                  <Button
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() =>
                      void changeStatus.mutateAsync({
                        studentId: student.id,
                        status: Status.APPROVED,
                      })
                    }
                  >
                    Approve
                  </Button>
                )}
                {student.profileStatus !== Status.REJECTED && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={changeStatus.isPending}
                    onClick={() =>
                      void changeStatus.mutateAsync({
                        studentId: student.id,
                        status: Status.REJECTED,
                      })
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
