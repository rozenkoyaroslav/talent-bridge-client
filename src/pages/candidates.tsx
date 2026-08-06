import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpecializations, useStudents } from '@/features/candidates/api';
import { useMyVacancies } from '@/features/vacancies/api';
import { useCreateBooking } from '@/features/bookings/api';
import { compactFilters, type Filter } from '@/shared/api/query-params';
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from '@/shared/ui';
import { FilterBar, ListShell } from '@/shared/ui/list-shell';
import { City, WorkType, type StudentListItem } from '@/entities/types';
import { humanize, yearsOld } from '@/shared/lib/format';

type FilterState = {
  specialization: string;
  city: string;
  ageFrom: string;
  ageTo: string;
  type: string;
  isLookingForJob: string;
  experience: string;
};

const EMPTY_FILTERS: FilterState = {
  specialization: '',
  city: '',
  ageFrom: '',
  ageTo: '',
  type: '',
  isLookingForJob: '',
  experience: '',
};

/** Turns the form state into the API's filter list, dropping untouched controls. */
const toFilters = (state: FilterState): Filter[] =>
  compactFilters([
    state.specialization ? { field: 'specialization', value: state.specialization } : null,
    state.city ? { field: 'city', value: state.city } : null,
    state.ageFrom || state.ageTo
      ? { field: 'age', value: { from: state.ageFrom, to: state.ageTo } }
      : null,
    state.type ? { field: 'type', value: [state.type] } : null,
    state.isLookingForJob ? { field: 'isLookingForJob', value: state.isLookingForJob } : null,
    state.experience ? { field: 'experience', value: [state.experience] } : null,
  ]);

export const CandidatesPage = () => {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [booking, setBooking] = useState<StudentListItem | null>(null);

  const specializations = useSpecializations();
  const query = useStudents({
    filters: toFilters(applied),
    sorting: { field: 'createdAt', direction: 'desc' },
    pagination: { page, limit: 9 },
  });

  const update = (patch: Partial<FilterState>) => setDraft(current => ({ ...current, ...patch }));

  const apply = () => {
    setApplied(draft);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Candidates"
        description="Students and graduates open to a practice or a job. People you have already contacted are hidden."
      />

      <FilterBar>
        <Field label="Specialization">
          <Select
            value={draft.specialization}
            onChange={event => update({ specialization: event.target.value })}
          >
            <option value="">Any</option>
            {specializations.data?.map(item => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="City">
          <Select value={draft.city} onChange={event => update({ city: event.target.value })}>
            <option value="">Any</option>
            {Object.values(City).map(city => (
              <option key={city} value={city}>
                {humanize(city)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Age" hint="Matched against date of birth">
          <div className="flex gap-2">
            <Input
              type="number"
              min={14}
              placeholder="From"
              value={draft.ageFrom}
              onChange={event => update({ ageFrom: event.target.value })}
            />
            <Input
              type="number"
              max={99}
              placeholder="To"
              value={draft.ageTo}
              onChange={event => update({ ageTo: event.target.value })}
            />
          </div>
        </Field>

        <Field label="Experience type">
          <Select value={draft.type} onChange={event => update({ type: event.target.value })}>
            <option value="">Any</option>
            <option value={WorkType.WORK}>Work</option>
            <option value={WorkType.TRAINING}>Training</option>
          </Select>
        </Field>

        <Field label="Years of experience" hint="At least this many">
          <Input
            type="number"
            min={0}
            placeholder="Any"
            value={draft.experience}
            onChange={event => update({ experience: event.target.value })}
          />
        </Field>

        <Field label="Looking for a job">
          <Select
            value={draft.isLookingForJob}
            onChange={event => update({ isLookingForJob: event.target.value })}
          >
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </Field>

        <div className="flex items-end gap-2 lg:col-span-2">
          <Button onClick={apply}>Apply filters</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setApplied(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </FilterBar>

      <ListShell
        query={query}
        onPageChange={setPage}
        emptyTitle="No candidates match these filters"
        emptyDescription="Try widening the age range or clearing the specialization."
      >
        {items => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map(student => (
              <CandidateCard key={student.id} student={student} onBook={() => setBooking(student)} />
            ))}
          </div>
        )}
      </ListShell>

      <BookingDialog student={booking} onClose={() => setBooking(null)} />
    </>
  );
};

const CandidateCard = ({
  student,
  onBook,
}: {
  student: StudentListItem;
  onBook: () => void;
}) => {
  const age = yearsOld(student.dateOfBirth);

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar
          src={student.user.profileImage}
          firstName={student.user.firstName}
          lastName={student.user.lastName}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/candidates/${student.user.id}`}
            className="block truncate font-medium text-slate-900 hover:text-blue-600"
          >
            {student.user.firstName} {student.user.lastName}
          </Link>
          <p className="truncate text-sm text-slate-500">
            {student.specialization?.title ?? 'No specialization'}
          </p>
        </div>
        {student.averageGrade > 0 && (
          <span
            className="rounded-lg bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-700"
            title="Average grade across completed practices"
          >
            {student.averageGrade.toFixed(1)}
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-600">
        {student.aboutMe ?? 'No summary yet.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {student.city && <Badge>{humanize(student.city)}</Badge>}
        {age !== null && <Badge>{age} years</Badge>}
        {student.status && <Badge>{humanize(student.status)}</Badge>}
        {student.isLookingForJob && (
          <Badge className="bg-blue-50 text-blue-700">Looking for a job</Badge>
        )}
        {student.isLookingForPractice && (
          <Badge className="bg-blue-50 text-blue-700">Open to practice</Badge>
        )}
        {student.workExperiences.length > 0 && (
          <Badge className="bg-amber-50 text-amber-700">In practice now</Badge>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={onBook}>
          Book for a vacancy
        </Button>
        <Link to={`/candidates/${student.user.id}`}>
          <Button size="sm" variant="secondary">
            View profile
          </Button>
        </Link>
      </div>
    </Card>
  );
};

const BookingDialog = ({
  student,
  onClose,
}: {
  student: StudentListItem | null;
  onClose: () => void;
}) => {
  const vacancies = useMyVacancies();
  const createBooking = useCreateBooking();

  const [vacancyId, setVacancyId] = useState('');
  const [workType, setWorkType] = useState<WorkType>(WorkType.TRAINING);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!student || !vacancyId) return;
    setError(null);

    try {
      await createBooking.mutateAsync({ studentId: student.id, vacancyId, workType, message });
      onClose();
      setMessage('');
      setVacancyId('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the booking');
    }
  };

  return (
    <Modal
      open={Boolean(student)}
      title={`Book ${student?.user.firstName ?? ''} ${student?.user.lastName ?? ''}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Vacancy">
          <Select value={vacancyId} onChange={event => setVacancyId(event.target.value)}>
            <option value="">Select a vacancy…</option>
            {vacancies.data?.map(vacancy => (
              <option key={vacancy.id} value={vacancy.id}>
                {vacancy.specialization?.title} · {humanize(vacancy.location)} ·{' '}
                {vacancy.status.toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type">
          <Select value={workType} onChange={event => setWorkType(event.target.value as WorkType)}>
            <option value={WorkType.TRAINING}>Training</option>
            <option value={WorkType.WORK}>Work</option>
          </Select>
        </Field>

        <Field label="Message" hint="Sent as the first message of the conversation">
          <Textarea
            rows={4}
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder="Introduce the role in a sentence or two…"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!vacancyId || createBooking.isPending} onClick={() => void submit()}>
            {createBooking.isPending ? 'Booking…' : 'Book candidate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
