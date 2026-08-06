import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/auth-context';
import { useSpecializations, useStudent } from '@/features/candidates/api';
import {
  UPLOAD_LIMITS,
  uploadWithProgress,
  useDeleteUpload,
  useToggleLooking,
  useUpdateStudentProfile,
} from '@/features/profile/api';
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@/shared/ui';
import { City, StudentStatus } from '@/entities/types';
import { humanize } from '@/shared/lib/format';
import { useQueryClient } from '@tanstack/react-query';

type ProfileForm = {
  firstName: string;
  lastName: string;
  patronymic: string;
  aboutMe: string;
  city: string;
  status: string;
  specialization: string;
  dateOfBirth: string;
  diplomaTopic: string;
  diplomaGrade: string;
  skill: { techSkill: string; flexibleSkill: string; keySkills: string };
  educations: {
    educationalInstitution: string;
    degree: string;
    specialization: string;
    dateFrom: string;
    dateTo: string;
    stillStudying: boolean;
  }[];
  languages: { name: string; level: string }[];
  workExperience: {
    company: string;
    specialization: string;
    dateFrom: string;
    dateTo: string;
    stillWorking: boolean;
  }[];
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

export const StudentProfilePage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useStudent(user?.id);
  const specializations = useSpecializations();
  const updateProfile = useUpdateStudentProfile();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      patronymic: '',
      aboutMe: '',
      city: '',
      status: '',
      specialization: '',
      dateOfBirth: '',
      diplomaTopic: '',
      diplomaGrade: '',
      skill: { techSkill: '', flexibleSkill: '', keySkills: '' },
      educations: [],
      languages: [],
      workExperience: [],
    },
  });

  const educations = useFieldArray({ control: form.control, name: 'educations' });
  const languages = useFieldArray({ control: form.control, name: 'languages' });
  const experience = useFieldArray({ control: form.control, name: 'workExperience' });

  // The form is populated once the profile arrives; `reset` avoids the controlled
  // inputs flipping between undefined and a value.
  useEffect(() => {
    const profile = data?.studentProfile;
    if (!data || !profile) return;

    form.reset({
      firstName: data.firstName,
      lastName: data.lastName,
      patronymic: data.patronymic ?? '',
      aboutMe: profile.aboutMe ?? '',
      city: profile.city ?? '',
      status: profile.status ?? '',
      specialization: profile.specializationId ?? '',
      dateOfBirth: toDateInput(profile.dateOfBirth),
      diplomaTopic: profile.diplomaTopic ?? '',
      diplomaGrade: profile.diplomaGrade ? String(profile.diplomaGrade) : '',
      skill: {
        techSkill: profile.skill?.techSkill ?? '',
        flexibleSkill: profile.skill?.flexibleSkill ?? '',
        keySkills: profile.skill?.keySkills.join(', ') ?? '',
      },
      educations: (profile.educations ?? []).map(item => ({
        educationalInstitution: item.educationalInstitution,
        degree: item.degree,
        specialization: item.specialization,
        dateFrom: toDateInput(item.dateFrom),
        dateTo: toDateInput(item.dateTo),
        stillStudying: item.stillStudying,
      })),
      languages: (profile.languages ?? []).map(item => ({ name: item.name, level: item.level })),
      workExperience: (profile.workExperiences ?? [])
        .filter(item => !item.generatedBySystem)
        .map(item => ({
          company: item.company,
          specialization: item.specialization,
          dateFrom: toDateInput(item.dateFrom),
          dateTo: toDateInput(item.dateTo),
          stillWorking: Boolean(item.stillWorking),
        })),
    });
  }, [data, form]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const profile = data?.studentProfile;

  const submit = form.handleSubmit(async values => {
    setError(null);
    setSaved(false);

    try {
      await updateProfile.mutateAsync({
        ...values,
        diplomaGrade: values.diplomaGrade ? Number(values.diplomaGrade) : undefined,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
        skill: {
          ...values.skill,
          keySkills: values.skill.keySkills
            .split(',')
            .map(skill => skill.trim())
            .filter(Boolean),
        },
        educations: values.educations.map(item => ({
          ...item,
          dateFrom: item.dateFrom ? new Date(item.dateFrom).toISOString() : null,
          dateTo: item.dateTo ? new Date(item.dateTo).toISOString() : null,
        })),
        workExperience: values.workExperience.map(item => ({
          ...item,
          dateFrom: item.dateFrom ? new Date(item.dateFrom).toISOString() : null,
          dateTo: item.dateTo ? new Date(item.dateTo).toISOString() : null,
        })),
      });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the profile');
    }
  });

  return (
    <>
      <PageHeader
        title="My profile"
        description="What employers see when they find you in search."
        actions={<StatusBadge status={profile?.profileStatus} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <form className="space-y-4 lg:col-span-2" onSubmit={submit}>
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="First name">
                <Input {...form.register('firstName')} />
              </Field>
              <Field label="Last name">
                <Input {...form.register('lastName')} />
              </Field>
              <Field label="Patronymic">
                <Input {...form.register('patronymic')} />
              </Field>
            </div>

            <Field label="About me">
              <Textarea rows={4} {...form.register('aboutMe')} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Specialization">
                <Select {...form.register('specialization')}>
                  <option value="">Select…</option>
                  {specializations.data?.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Status">
                <Select {...form.register('status')}>
                  <option value="">Select…</option>
                  {Object.values(StudentStatus).map(value => (
                    <option key={value} value={value}>
                      {humanize(value)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="City">
                <Select {...form.register('city')}>
                  <option value="">Select…</option>
                  {Object.values(City).map(value => (
                    <option key={value} value={value}>
                      {humanize(value)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Date of birth">
                <Input type="date" {...form.register('dateOfBirth')} />
              </Field>

              <Field label="Diploma topic">
                <Input {...form.register('diplomaTopic')} />
              </Field>

              <Field label="Diploma grade">
                <Input type="number" min={1} max={100} {...form.register('diplomaGrade')} />
              </Field>
            </div>
          </Card>

          <RepeatableSection
            title="Education"
            onAdd={() =>
              educations.append({
                educationalInstitution: '',
                degree: '',
                specialization: '',
                dateFrom: '',
                dateTo: '',
                stillStudying: false,
              })
            }
          >
            {educations.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <Field label="Institution">
                  <Input {...form.register(`educations.${index}.educationalInstitution`)} />
                </Field>
                <Field label="Degree">
                  <Input {...form.register(`educations.${index}.degree`)} />
                </Field>
                <Field label="Specialization">
                  <Input {...form.register(`educations.${index}.specialization`)} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From">
                    <Input type="date" {...form.register(`educations.${index}.dateFrom`)} />
                  </Field>
                  <Field label="To">
                    <Input type="date" {...form.register(`educations.${index}.dateTo`)} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" {...form.register(`educations.${index}.stillStudying`)} />
                  Still studying
                </label>
                <div className="flex items-end justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => educations.remove(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </RepeatableSection>

          <RepeatableSection
            title="Work experience"
            hint="Placements arranged through the platform are added automatically and cannot be edited here."
            onAdd={() =>
              experience.append({
                company: '',
                specialization: '',
                dateFrom: '',
                dateTo: '',
                stillWorking: false,
              })
            }
          >
            {experience.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <Field label="Company">
                  <Input {...form.register(`workExperience.${index}.company`)} />
                </Field>
                <Field label="Role">
                  <Input {...form.register(`workExperience.${index}.specialization`)} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From">
                    <Input type="date" {...form.register(`workExperience.${index}.dateFrom`)} />
                  </Field>
                  <Field label="To">
                    <Input type="date" {...form.register(`workExperience.${index}.dateTo`)} />
                  </Field>
                </div>
                <div className="flex items-end justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" {...form.register(`workExperience.${index}.stillWorking`)} />
                    Still working
                  </label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => experience.remove(index)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </RepeatableSection>

          <RepeatableSection title="Languages" onAdd={() => languages.append({ name: '', level: 'B1' })}>
            {languages.fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-3 border-t border-slate-100 pt-3">
                <Field label="Language">
                  <Input {...form.register(`languages.${index}.name`)} />
                </Field>
                <Field label="Level">
                  <Select {...form.register(`languages.${index}.level`)}>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="button" variant="ghost" size="sm" onClick={() => languages.remove(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </RepeatableSection>

          <Card className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Skills</h2>
            <Field label="Technical skills">
              <Input {...form.register('skill.techSkill')} />
            </Field>
            <Field label="Flexible skills">
              <Input {...form.register('skill.flexibleSkill')} />
            </Field>
            <Field label="Key skills" hint="Comma separated">
              <Input {...form.register('skill.keySkills')} />
            </Field>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-xs text-slate-600">
              Saving sends the profile back for moderation — it will not appear in search until an
              administrator approves it again.
            </p>
            <div className="flex items-center gap-3">
              {saved && <span className="text-sm text-emerald-600">Saved</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </Card>
        </form>

        <div className="space-y-4">
          <AvailabilityCard
            isLookingForJob={profile?.isLookingForJob ?? false}
            isLookingForPractice={profile?.isLookingForPractice ?? false}
          />
          <UploadsCard cv={profile?.cv ?? null} interview={profile?.interview ?? null} />
        </div>
      </div>
    </>
  );
};

const RepeatableSection = ({
  title,
  hint,
  onAdd,
  children,
}: {
  title: string;
  hint?: string;
  onAdd: () => void;
  children: React.ReactNode;
}) => (
  <Card className="space-y-3 p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
        Add
      </Button>
    </div>
    {children}
  </Card>
);

const AvailabilityCard = ({
  isLookingForJob,
  isLookingForPractice,
}: {
  isLookingForJob: boolean;
  isLookingForPractice: boolean;
}) => {
  const toggleJob = useToggleLooking('job');
  const togglePractice = useToggleLooking('practice');

  return (
    <Card className="space-y-3 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Availability</h2>

      <label className="flex items-center justify-between text-sm text-slate-700">
        Looking for a job
        <input
          type="checkbox"
          checked={isLookingForJob}
          onChange={event => void toggleJob.mutateAsync(event.target.checked)}
        />
      </label>

      <label className="flex items-center justify-between text-sm text-slate-700">
        Open to a practice
        <input
          type="checkbox"
          checked={isLookingForPractice}
          onChange={event => void togglePractice.mutateAsync(event.target.checked)}
        />
      </label>

      <p className="text-xs text-slate-500">
        These two flags are filters employers use, so they take effect immediately rather than on
        save.
      </p>
    </Card>
  );
};

const UploadsCard = ({ cv, interview }: { cv: string | null; interview: string | null }) => {
  const queryClient = useQueryClient();
  const deleteResume = useDeleteUpload('resume');
  const deleteInterview = useDeleteUpload('interview');

  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (kind: 'resume' | 'interview', file?: File | null) => {
    if (!file) return;

    const limit = UPLOAD_LIMITS[kind];
    // Checked before sending: a 100 MB upload that fails validation server-side is
    // the worst possible way to learn the file was too big.
    if (file.size > limit.maxMb * 1024 * 1024) {
      setUploadError(`${file.name} is larger than ${limit.maxMb} MB`);
      return;
    }

    setUploadError(null);
    setProgress(current => ({ ...current, [kind]: 0 }));

    try {
      await uploadWithProgress(limit.path, file, percent =>
        setProgress(current => ({ ...current, [kind]: percent })),
      );
      void queryClient.invalidateQueries({ queryKey: ['student'] });
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : 'Upload failed');
    } finally {
      setProgress(current => {
        const next = { ...current };
        delete next[kind];
        return next;
      });
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Attachments</h2>

      {(['resume', 'interview'] as const).map(kind => {
        const value = kind === 'resume' ? cv : interview;
        const remove = kind === 'resume' ? deleteResume : deleteInterview;

        return (
          <div key={kind} className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700">
              {kind === 'resume' ? 'Résumé' : 'Video interview'}
            </p>

            {value ? (
              <div className="flex items-center gap-2 text-sm">
                <a href={value} className="text-blue-600 hover:underline">
                  Open
                </a>
                <Button variant="ghost" size="sm" onClick={() => void remove.mutateAsync()}>
                  Remove
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept={UPLOAD_LIMITS[kind].accept}
                onChange={event => void upload(kind, event.target.files?.[0])}
              />
            )}

            {progress[kind] !== undefined && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${progress[kind]}%` }}
                />
              </div>
            )}
          </div>
        );
      })}

      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
    </Card>
  );
};
