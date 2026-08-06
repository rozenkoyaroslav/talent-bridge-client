import { useState } from 'react';
import { useSpecializations } from '@/features/candidates/api';
import { useRespondToVacancy, useVacancies, type VacancyWithEmployer } from '@/features/vacancies/api';
import { compactFilters, type Filter } from '@/shared/api/query-params';
import { Badge, Button, Card, Field, Modal, PageHeader, Select, StatusBadge, Textarea } from '@/shared/ui';
import { FilterBar, ListShell } from '@/shared/ui/list-shell';
import { City, StudentStatus, WorkType } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

export const VacanciesPage = () => {
  const [specialization, setSpecialization] = useState('');
  const [location, setLocation] = useState('');
  const [candidateStatus, setCandidateStatus] = useState('');
  const [page, setPage] = useState(1);
  const [responding, setResponding] = useState<VacancyWithEmployer | null>(null);

  const specializations = useSpecializations();

  const filters: Filter[] = compactFilters([
    specialization ? { field: 'specialization', value: [specialization] } : null,
    location ? { field: 'location', value: location } : null,
    candidateStatus ? { field: 'candidateStatus', value: [candidateStatus] } : null,
  ]);

  const query = useVacancies({
    filters,
    sorting: { field: 'createdAt', direction: 'desc' },
    pagination: { page, limit: 10 },
  });

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Vacancies" description="Approved openings from verified employers." />

      <FilterBar>
        <Field label="Specialization">
          <Select
            value={specialization}
            onChange={event => reset(setSpecialization)(event.target.value)}
          >
            <option value="">Any</option>
            {specializations.data?.map(item => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Location">
          <Select value={location} onChange={event => reset(setLocation)(event.target.value)}>
            <option value="">Any</option>
            {Object.values(City).map(city => (
              <option key={city} value={city}>
                {humanize(city)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Looking for">
          <Select
            value={candidateStatus}
            onChange={event => reset(setCandidateStatus)(event.target.value)}
          >
            <option value="">Anyone</option>
            {Object.values(StudentStatus).map(status => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </Select>
        </Field>
      </FilterBar>

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="No vacancies match these filters"
        emptyDescription="Clear a filter or check back after the next digest."
      >
        {items => (
          <div className="space-y-3">
            {items.map(vacancy => (
              <Card key={vacancy.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-900">
                      {vacancy.specialization?.title ?? 'Vacancy'} · {vacancy.company}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {humanize(vacancy.location)} · posted {formatDate(vacancy.createdAt)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setResponding(vacancy)}>
                    Respond
                  </Button>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-slate-600">{vacancy.description}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>Open to {humanize(vacancy.candidateStatus).toLowerCase()}s</Badge>
                  <StatusBadge status={vacancy.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </ListShell>

      <RespondDialog vacancy={responding} onClose={() => setResponding(null)} />
    </>
  );
};

const RespondDialog = ({
  vacancy,
  onClose,
}: {
  vacancy: VacancyWithEmployer | null;
  onClose: () => void;
}) => {
  const respond = useRespondToVacancy();
  const [workType, setWorkType] = useState<WorkType>(WorkType.TRAINING);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!vacancy) return;
    setError(null);

    try {
      await respond.mutateAsync({ vacancyId: vacancy.id, workType, message });
      setMessage('');
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the response');
    }
  };

  return (
    <Modal open={Boolean(vacancy)} title={`Respond to ${vacancy?.company ?? ''}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="I am applying for">
          <Select value={workType} onChange={event => setWorkType(event.target.value as WorkType)}>
            <option value={WorkType.TRAINING}>A practice placement</option>
            <option value={WorkType.WORK}>A job</option>
          </Select>
        </Field>

        <Field label="Message" hint="Opens a conversation with the employer">
          <Textarea
            rows={4}
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder="Say why you are a good fit…"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={respond.isPending} onClick={() => void submit()}>
            {respond.isPending ? 'Sending…' : 'Send response'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
