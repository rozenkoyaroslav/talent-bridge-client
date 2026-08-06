import { useState } from 'react';
import { useChangeUserStatus, useUsers } from '@/features/admin/api';
import { compactFilters } from '@/shared/api/query-params';
import { Avatar, Button, Card, Field, Input, PageHeader, Select, StatusBadge } from '@/shared/ui';
import { FilterBar, ListShell } from '@/shared/ui/list-shell';
import { Role, Status } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

export const AdminUsersPage = () => {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [page, setPage] = useState(1);

  const changeStatus = useChangeUserStatus();
  const query = useUsers({
    filters: compactFilters([
      role ? { field: 'role', value: role } : null,
      status ? { field: 'status', value: status } : null,
      email ? { field: 'email', value: email } : null,
    ]),
    sorting: { field: 'createdAt', direction: 'desc' },
    pagination: { page, limit: 15 },
  });

  const onFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Approving an account also opens its support conversation with the admins."
      />

      <FilterBar>
        <Field label="Role">
          <Select value={role} onChange={event => onFilterChange(setRole)(event.target.value)}>
            <option value="">Any</option>
            {Object.values(Role).map(value => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status">
          <Select value={status} onChange={event => onFilterChange(setStatus)(event.target.value)}>
            <option value="">Any</option>
            {Object.values(Status).map(value => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Email contains">
          <Input value={email} onChange={event => onFilterChange(setEmail)(event.target.value)} />
        </Field>
      </FilterBar>

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="No users match these filters"
      >
        {items => (
          <Card className="divide-y divide-slate-100">
            {items.map(user => (
              <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar src={user.profileImage} firstName={user.firstName} lastName={user.lastName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {user.email} · {humanize(user.role)} · joined {formatDate(user.createdAt)}
                  </p>
                </div>

                <StatusBadge status={user.status} />

                {user.status !== Status.APPROVED && (
                  <Button
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() =>
                      void changeStatus.mutateAsync({ userId: user.id, status: Status.APPROVED })
                    }
                  >
                    Approve
                  </Button>
                )}
                {user.status !== Status.REJECTED && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={changeStatus.isPending}
                    onClick={() =>
                      void changeStatus.mutateAsync({ userId: user.id, status: Status.REJECTED })
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
