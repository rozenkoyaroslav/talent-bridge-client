import { useState } from 'react';
import { useSpecializations } from '@/features/candidates/api';
import {
  useCreateVacancy,
  useDeleteVacancy,
  useMyVacancies,
  useUpdateVacancy,
  type VacancyWithEmployer,
} from '@/features/vacancies/api';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@/shared/ui';
import { City, Status, StudentStatus } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

type FormState = {
  specialization: string;
  candidateStatus: string;
  company: string;
  location: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  specialization: '',
  candidateStatus: StudentStatus.STUDENT,
  company: '',
  location: City.BERLIN,
  description: '',
};

export const MyVacanciesPage = () => {
  const { data, isLoading } = useMyVacancies();
  const createVacancy = useCreateVacancy();
  const updateVacancy = useUpdateVacancy();
  const deleteVacancy = useDeleteVacancy();
  const specializations = useSpecializations();

  const [editing, setEditing] = useState<VacancyWithEmployer | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const open = (vacancy?: VacancyWithEmployer) => {
    setEditing(vacancy ?? null);
    setForm(
      vacancy
        ? {
            specialization: vacancy.specializationId,
            candidateStatus: vacancy.candidateStatus,
            company: vacancy.company,
            location: vacancy.location,
            description: vacancy.description,
          }
        : EMPTY_FORM,
    );
    setError(null);
    setIsOpen(true);
  };

  const submit = async () => {
    setError(null);

    try {
      if (editing) await updateVacancy.mutateAsync({ id: editing.id, ...form });
      else await createVacancy.mutateAsync(form);

      setIsOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the vacancy');
    }
  };

  return (
    <>
      <PageHeader
        title="My vacancies"
        description="New and edited vacancies go back to moderation before they appear to students."
        actions={<Button onClick={() => open()}>New vacancy</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          title="No vacancies yet"
          description="Publish one and candidates will be able to respond."
        />
      ) : (
        <div className="space-y-3">
          {data.map(vacancy => (
            <Card key={vacancy.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium text-slate-900">
                    {vacancy.specialization?.title ?? 'Vacancy'}
                  </h2>
                  <StatusBadge status={vacancy.status} />
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {humanize(vacancy.location)} · for {humanize(vacancy.candidateStatus).toLowerCase()}s
                  · created {formatDate(vacancy.createdAt)}
                </p>
                <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-slate-600">
                  {vacancy.description}
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => open(vacancy)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={deleteVacancy.isPending}
                  onClick={() => void deleteVacancy.mutateAsync(vacancy.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={isOpen}
        title={editing ? 'Edit vacancy' : 'New vacancy'}
        onClose={() => setIsOpen(false)}
      >
        <div className="space-y-4">
          <Field label="Specialization">
            <Select
              value={form.specialization}
              onChange={event => setForm({ ...form, specialization: event.target.value })}
            >
              <option value="">Select…</option>
              {specializations.data?.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company">
              <Input
                value={form.company}
                onChange={event => setForm({ ...form, company: event.target.value })}
              />
            </Field>

            <Field label="Location">
              <Select
                value={form.location}
                onChange={event => setForm({ ...form, location: event.target.value })}
              >
                {Object.values(City).map(city => (
                  <option key={city} value={city}>
                    {humanize(city)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Open to">
            <Select
              value={form.candidateStatus}
              onChange={event => setForm({ ...form, candidateStatus: event.target.value })}
            >
              {Object.values(StudentStatus).map(status => (
                <option key={status} value={status}>
                  {humanize(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description">
            <Textarea
              rows={5}
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
            />
          </Field>

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Saving sets the vacancy back to {humanize(Status.PENDING).toLowerCase()} until an
            administrator approves it.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.specialization || createVacancy.isPending || updateVacancy.isPending}
              onClick={() => void submit()}
            >
              {editing ? 'Save changes' : 'Publish'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
