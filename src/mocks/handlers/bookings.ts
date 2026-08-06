import { http, HttpResponse } from 'msw';
import { db } from '../db';
import {
  buildMeta,
  commit,
  currentUser,
  employerByUserId,
  findFilter,
  mockDelay,
  paginate,
  parseListParams,
  profileByUserId,
  requireRole,
  sortItems,
  userOf,
  vacancyWithEmployer,
} from '../helpers';
import { PracticeStatus, Role, Status, type StudentBooking } from '@/entities/types';
import { API_PREFIX } from '@/shared/api/http';
import { openConversation } from './chat';

const url = (path: string) => `*${API_PREFIX}${path}`;

const withRelations = (booking: StudentBooking) => {
  const profile = db.studentProfiles.find(item => item.id === booking.studentId);

  return {
    ...booking,
    vacancy: vacancyWithEmployer(booking.vacancyId),
    student: profile ? { ...profile, user: userOf(profile) } : null,
    studentWorkExperiences: db.experiences.filter(
      experience => experience.studentId === booking.studentId && experience.vacancyId === booking.vacancyId,
    ),
  };
};

const listBookings = (request: Request, bookings: StudentBooking[]) => {
  const { filters, sorting, pagination } = parseListParams(new URL(request.url));

  const status = findFilter(filters, 'status');
  const filtered = status ? bookings.filter(booking => booking.status === status) : bookings;
  const sorted = sortItems(filtered, sorting);

  return HttpResponse.json({
    bookings: paginate(sorted, pagination).map(withRelations),
    metadata: buildMeta(sorted.length, pagination),
  });
};

const employerBookings = (userId: string) => {
  const employer = employerByUserId(userId);

  return db.bookings.filter(booking =>
    db.vacancies.some(vacancy => vacancy.id === booking.vacancyId && vacancy.createdById === employer?.id),
  );
};

export const bookingHandlers = [
  http.post(url('/student-booking'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const body = (await request.json()) as {
      studentId: string;
      vacancyId: string;
      workType: never;
      message?: string;
    };

    if (db.bookings.some(b => b.studentId === body.studentId && b.vacancyId === body.vacancyId)) {
      return HttpResponse.json({ message: 'Candidate already booked for this vacancy' }, { status: 409 });
    }

    const booking: StudentBooking = {
      studentId: body.studentId,
      vacancyId: body.vacancyId,
      status: Status.PENDING,
      statusByEmployer: Status.APPROVED,
      statusByStudent: Status.PENDING,
      workType: body.workType,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      rejectedAt: null,
    };
    db.bookings.push(booking);

    const profile = db.studentProfiles.find(item => item.id === body.studentId);
    if (profile) openConversation(user!.id, profile.userId, body.message);

    return HttpResponse.json(commit(withRelations(booking)), { status: 201 });
  }),

  http.get(url('/student-booking/my-history'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const history = employerBookings(user!.id).filter(booking => booking.status !== Status.PENDING);

    return listBookings(request, history);
  }),

  http.get(url('/student-booking/my'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    return listBookings(request, employerBookings(user!.id));
  }),

  http.get(url('/student-bookingstudent/my'), async ({ request }) => {
    // The API concatenates its endpoint constants without a slash here, producing
    // `/student-bookingstudent/my`. Matching the real path keeps the mock honest.
    await mockDelay();
    const { user, error } = requireRole(request, Role.STUDENT);
    if (error) return error;

    const profile = profileByUserId(user!.id);
    return listBookings(
      request,
      db.bookings.filter(booking => booking.studentId === profile?.id),
    );
  }),

  http.get(url('/student-booking/:studentId/:vacancyId'), async ({ request, params }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const booking = db.bookings.find(
      item => item.studentId === String(params.studentId) && item.vacancyId === String(params.vacancyId),
    );
    if (!booking) return HttpResponse.json({ message: 'Booking not found' }, { status: 404 });

    return HttpResponse.json(withRelations(booking));
  }),

  http.get(url('/student-booking'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    return listBookings(request, db.bookings);
  }),

  http.patch(url('/student-booking/change-status'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const { studentId, vacancyId, status } = (await request.json()) as {
      studentId: string;
      vacancyId: string;
      status: Status;
    };

    const booking = db.bookings.find(item => item.studentId === studentId && item.vacancyId === vacancyId);
    if (!booking) return HttpResponse.json({ message: 'Booking not found' }, { status: 404 });

    booking.status = status;
    booking.approvedAt = status === Status.APPROVED ? new Date().toISOString() : null;
    booking.rejectedAt = status === Status.REJECTED ? new Date().toISOString() : null;

    return HttpResponse.json(commit(withRelations(booking)));
  }),

  ...(['status-by-employer', 'status-by-student'] as const).map(segment =>
    http.patch(url(`/student-booking/${segment}`), async ({ request }) => {
      await mockDelay();
      const user = currentUser(request);
      if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

      const { studentId, vacancyId, status } = (await request.json()) as {
        studentId: string;
        vacancyId: string;
        status: Status;
      };

      const booking = db.bookings.find(item => item.studentId === studentId && item.vacancyId === vacancyId);
      if (!booking) return HttpResponse.json({ message: 'Booking not found' }, { status: 404 });

      const started = db.experiences.some(
        experience => experience.studentId === studentId && experience.vacancyId === vacancyId,
      );
      if (started) {
        return HttpResponse.json(
          { message: 'Cannot change booking: student practice has already started' },
          { status: 409 },
        );
      }

      if (segment === 'status-by-employer') booking.statusByEmployer = status;
      else booking.statusByStudent = status;

      // Both sides approving is what turns a booking into a practice.
      if (booking.statusByEmployer === Status.APPROVED && booking.statusByStudent === Status.APPROVED) {
        booking.status = Status.APPROVED;
        booking.approvedAt = new Date().toISOString();
      }

      return HttpResponse.json(commit(withRelations(booking)));
    }),
  ),
];

export const practiceHandlers = [
  http.post(url('/practice-and-work'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as { studentId: string; vacancyId: string; type: never };
    const vacancy = db.vacancies.find(item => item.id === body.vacancyId);
    if (!vacancy) return HttpResponse.json({ message: 'Vacancy not found' }, { status: 404 });

    const experience = {
      id: crypto.randomUUID(),
      studentId: body.studentId,
      vacancyId: body.vacancyId,
      company: vacancy.company,
      specialization: vacancy.specialization.title,
      type: body.type,
      generatedBySystem: true,
      dateFrom: new Date().toISOString(),
      dateTo: null,
      stillWorking: true,
      approvedStartByStudent: user.role === Role.STUDENT,
      approvedStartByEmployer: user.role === Role.EMPLOYER,
      approvedEndByStudent: null,
      approvedEndByEmployer: null,
      practiceStatus: PracticeStatus.PENDING,
      gradePractice: null,
      feedback: null,
    };

    db.experiences.push(experience);

    return HttpResponse.json(commit(experience), { status: 201 });
  }),

  http.get(url('/practice-and-work/my'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.STUDENT);
    if (error) return error;

    const profile = profileByUserId(user!.id);
    const practices = db.experiences.filter(
      experience => experience.studentId === profile?.id && experience.generatedBySystem,
    );

    return HttpResponse.json(
      practices.map(practice => ({ ...practice, vacancy: vacancyWithEmployer(practice.vacancyId ?? '') })),
    );
  }),

  http.get(url('/practice-and-work/employer/my'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const employer = employerByUserId(user!.id);
    const vacancyIds = new Set(
      db.vacancies.filter(vacancy => vacancy.createdById === employer?.id).map(vacancy => vacancy.id),
    );

    const practices = db.experiences.filter(
      experience => experience.generatedBySystem && experience.vacancyId && vacancyIds.has(experience.vacancyId),
    );

    return HttpResponse.json(
      practices.map(practice => {
        const profile = db.studentProfiles.find(item => item.id === practice.studentId);

        return {
          ...practice,
          vacancy: vacancyWithEmployer(practice.vacancyId ?? ''),
          student: profile ? { ...profile, user: userOf(profile) } : null,
        };
      }),
    );
  }),

  http.patch(url('/practice-and-work/update/:id'), async ({ request, params }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const practice = db.experiences.find(item => item.id === String(params.id));
    if (!practice) return HttpResponse.json({ message: 'Practice not found' }, { status: 404 });

    const body = (await request.json()) as Record<string, boolean>;
    Object.assign(practice, body);

    // A practice only becomes active once both sides confirm the start.
    if (practice.approvedStartByStudent && practice.approvedStartByEmployer) {
      practice.practiceStatus = PracticeStatus.APPROVED;
    }

    return HttpResponse.json(commit(practice));
  }),

  http.patch(url('/practice-and-work/complete/:id'), async ({ request, params }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const practice = db.experiences.find(item => item.id === String(params.id));
    if (!practice) return HttpResponse.json({ message: 'Practice not found' }, { status: 404 });

    const body = (await request.json()) as {
      gradePractice?: number;
      feedback?: string;
      approvedEndByEmployer?: boolean;
    };

    practice.gradePractice = body.gradePractice ?? practice.gradePractice;
    practice.feedback = body.feedback ?? practice.feedback;
    practice.approvedEndByEmployer = body.approvedEndByEmployer ?? true;
    practice.approvedEndByStudent = true;
    practice.practiceStatus = PracticeStatus.COMPLETED;
    practice.stillWorking = false;
    practice.dateTo = new Date().toISOString();

    return HttpResponse.json(commit(practice));
  }),
];
