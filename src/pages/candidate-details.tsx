import { useParams } from 'react-router-dom';
import { useStudent } from '@/features/candidates/api';
import { Avatar, Badge, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '@/shared/ui';
import { formatDate, humanize, yearsOld } from '@/shared/lib/format';
import { PracticeStatus } from '@/entities/types';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="p-5">
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
    {children}
  </Card>
);

export const CandidateDetailsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading } = useStudent(userId);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data?.studentProfile) return <EmptyState title="Candidate not found" />;

  const profile = data.studentProfile;
  const age = yearsOld(profile.dateOfBirth);
  const practices = (profile.workExperiences ?? []).filter(item => item.generatedBySystem);
  const ownExperience = (profile.workExperiences ?? []).filter(item => !item.generatedBySystem);

  return (
    <>
      <PageHeader title={`${data.firstName} ${data.lastName}`} description={data.email} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="About">
            <div className="flex items-start gap-4">
              <Avatar
                src={data.profileImage}
                firstName={data.firstName}
                lastName={data.lastName}
                size={64}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-600">{profile.aboutMe ?? 'No summary yet.'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.specialization && <Badge>{profile.specialization.title}</Badge>}
                  {profile.city && <Badge>{humanize(profile.city)}</Badge>}
                  {age !== null && <Badge>{age} years</Badge>}
                  {profile.status && <Badge>{humanize(profile.status)}</Badge>}
                  <StatusBadge status={profile.profileStatus} />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Education">
            {profile.educations?.length ? (
              <ul className="space-y-3">
                {profile.educations.map(education => (
                  <li key={education.id} className="text-sm">
                    <p className="font-medium text-slate-800">{education.educationalInstitution}</p>
                    <p className="text-slate-500">
                      {education.degree} · {education.specialization} ·{' '}
                      {formatDate(education.dateFrom)} —{' '}
                      {education.stillStudying ? 'present' : formatDate(education.dateTo)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nothing listed.</p>
            )}
          </Section>

          <Section title="Experience">
            {ownExperience.length ? (
              <ul className="space-y-3">
                {ownExperience.map(experience => (
                  <li key={experience.id} className="text-sm">
                    <p className="font-medium text-slate-800">{experience.company}</p>
                    <p className="text-slate-500">
                      {experience.specialization} · {formatDate(experience.dateFrom)} —{' '}
                      {experience.stillWorking ? 'present' : formatDate(experience.dateTo)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nothing listed.</p>
            )}
          </Section>

          <Section title="Practices on the platform">
            {practices.length ? (
              <ul className="space-y-3">
                {practices.map(practice => (
                  <li key={practice.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{practice.company}</p>
                      <p className="text-slate-500">
                        {humanize(practice.type)} · {formatDate(practice.dateFrom)}
                        {practice.feedback ? ` · “${practice.feedback}”` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {practice.practiceStatus === PracticeStatus.COMPLETED &&
                        practice.gradePractice != null && (
                          <Badge className="bg-blue-50 text-blue-700">
                            {practice.gradePractice}/100
                          </Badge>
                        )}
                      <StatusBadge status={practice.practiceStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No platform practices yet.</p>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Average practice grade">
            <p className="text-3xl font-semibold text-slate-900">
              {profile.averageGrade ? profile.averageGrade.toFixed(1) : '—'}
              <span className="ml-1 text-base font-normal text-slate-400">/100</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Mean of completed, platform-generated practices.
            </p>
          </Section>

          <Section title="Skills">
            {profile.skill ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Technical: </span>
                  {profile.skill.techSkill}
                </p>
                <p>
                  <span className="text-slate-500">Flexible: </span>
                  {profile.skill.flexibleSkill}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.skill.keySkills.map(skill => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nothing listed.</p>
            )}
          </Section>

          <Section title="Languages">
            {profile.languages?.length ? (
              <ul className="space-y-1 text-sm">
                {profile.languages.map(language => (
                  <li key={language.id} className="flex justify-between">
                    <span className="text-slate-700">{language.name}</span>
                    <span className="text-slate-500">{language.level}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nothing listed.</p>
            )}
          </Section>

          <Section title="Attachments">
            <ul className="space-y-2 text-sm">
              <li>
                Résumé:{' '}
                {profile.cv ? (
                  <a className="text-blue-600 hover:underline" href={profile.cv}>
                    download
                  </a>
                ) : (
                  <span className="text-slate-500">not uploaded</span>
                )}
              </li>
              <li>
                Video interview:{' '}
                {profile.interview ? (
                  <a className="text-blue-600 hover:underline" href={profile.interview}>
                    watch
                  </a>
                ) : (
                  <span className="text-slate-500">not uploaded</span>
                )}
              </li>
              {profile.certificates?.map(certificate => (
                <li key={certificate.id}>
                  <a className="text-blue-600 hover:underline" href={certificate.url}>
                    {certificate.title}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
};
