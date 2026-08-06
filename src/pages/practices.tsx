import { useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useCompletePractice, usePractices, useUpdatePractice, type Practice } from '@/features/practices/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@/shared/ui';
import { PracticeStatus, Role } from '@/entities/types';
import { formatDate, humanize } from '@/shared/lib/format';

/**
 * A practice starts and ends on a two-sided handshake: each party confirms
 * separately, and only the employer closes it with a grade. The UI shows whose
 * confirmation is still missing, because otherwise "pending" says nothing.
 */
export const PracticesPage = () => {
  const { user } = useAuth();
  const isEmployer = user?.role === Role.EMPLOYER;
  const scope = isEmployer ? 'employer' : 'student';

  const { data, isLoading } = usePractices(scope);
  const updatePractice = useUpdatePractice();
  const [completing, setCompleting] = useState<Practice | null>(null);

  const confirm = (practice: Practice, phase: 'start' | 'end') => {
    const field =
      phase === 'start'
        ? isEmployer
          ? 'approvedStartByEmployer'
          : 'approvedStartByStudent'
        : isEmployer
          ? 'approvedEndByEmployer'
          : 'approvedEndByStudent';

    void updatePractice.mutateAsync({ id: practice.id, [field]: true } as { id: string } & Partial<Record<string, boolean>>);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Practices"
        description={
          isEmployer
            ? 'Placements at your company. Close one with a grade and feedback.'
            : 'Your placements. Confirm the start and the end when they happen.'
        }
      />

      {!data?.length ? (
        <EmptyState
          title="No practices yet"
          description="A practice appears once a booking is approved by both sides."
        />
      ) : (
        <div className="space-y-3">
          {data.map(practice => {
            const startPending = !practice.approvedStartByStudent || !practice.approvedStartByEmployer;
            const myStartDone = isEmployer
              ? practice.approvedStartByEmployer
              : practice.approvedStartByStudent;
            const isCompleted = practice.practiceStatus === PracticeStatus.COMPLETED;

            const counterpartName = isEmployer
              ? `${practice.student?.user?.firstName ?? ''} ${practice.student?.user?.lastName ?? ''}`.trim()
              : practice.company;

            return (
              <Card key={practice.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-900">
                      {counterpartName || 'Practice'} · {practice.specialization}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {humanize(practice.type)} · started {formatDate(practice.dateFrom)}
                      {practice.dateTo ? ` · ended ${formatDate(practice.dateTo)}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={practice.practiceStatus} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={practice.approvedStartByStudent ? 'bg-emerald-50 text-emerald-700' : ''}
                  >
                    start · student {practice.approvedStartByStudent ? '✓' : '—'}
                  </Badge>
                  <Badge
                    className={practice.approvedStartByEmployer ? 'bg-emerald-50 text-emerald-700' : ''}
                  >
                    start · employer {practice.approvedStartByEmployer ? '✓' : '—'}
                  </Badge>
                  {isCompleted && practice.gradePractice != null && (
                    <Badge className="bg-blue-50 text-blue-700">
                      grade {practice.gradePractice}/100
                    </Badge>
                  )}
                </div>

                {practice.feedback && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    “{practice.feedback}”
                  </p>
                )}

                {!isCompleted && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {startPending && !myStartDone && (
                      <Button size="sm" onClick={() => confirm(practice, 'start')}>
                        Confirm start
                      </Button>
                    )}
                    {startPending && myStartDone && (
                      <span className="text-sm text-slate-500">
                        Waiting for the other side to confirm the start.
                      </span>
                    )}
                    {!startPending && isEmployer && (
                      <Button size="sm" onClick={() => setCompleting(practice)}>
                        Complete and grade
                      </Button>
                    )}
                    {!startPending && !isEmployer && (
                      <span className="text-sm text-slate-500">
                        In progress — the employer closes it with a grade.
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <CompleteDialog practice={completing} onClose={() => setCompleting(null)} />
    </>
  );
};

const CompleteDialog = ({
  practice,
  onClose,
}: {
  practice: Practice | null;
  onClose: () => void;
}) => {
  const complete = useCompletePractice();
  const [grade, setGrade] = useState('85');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!practice) return;
    setError(null);

    try {
      await complete.mutateAsync({ id: practice.id, gradePractice: Number(grade), feedback });
      onClose();
      setFeedback('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete the practice');
    }
  };

  return (
    <Modal open={Boolean(practice)} title="Complete the practice" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Grade" hint="1–100. Feeds the candidate's average shown in search.">
          <Input
            type="number"
            min={1}
            max={100}
            value={grade}
            onChange={event => setGrade(event.target.value)}
          />
        </Field>

        <Field label="Feedback">
          <Textarea
            rows={4}
            value={feedback}
            onChange={event => setFeedback(event.target.value)}
            placeholder="How did the placement go?"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={complete.isPending} onClick={() => void submit()}>
            {complete.isPending ? 'Saving…' : 'Complete'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
