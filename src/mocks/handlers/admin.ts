import { http, HttpResponse } from 'msw';
import { db } from '../db';
import {
  buildMeta,
  commit,
  currentUser,
  findFilter,
  mockDelay,
  paginate,
  parseListParams,
  publicUser,
  requireRole,
  sortItems,
  userOf,
} from '../helpers';
import { ChatType, PracticeStatus, Role, Status } from '@/entities/types';
import { API_PREFIX } from '@/shared/api/http';

const url = (path: string) => `*${API_PREFIX}${path}`;

export const adminHandlers = [
  http.get(url('/user/analytics/counts'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const byRole = Object.values(Role).reduce<Record<string, number>>((acc, role) => {
      acc[role] = db.users.filter(user => user.role === role).length;
      return acc;
    }, {});

    return HttpResponse.json({ total: db.users.length, byRole });
  }),

  http.get(url('/user/analytics/monthly'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const requestUrl = new URL(request.url);
    const { pagination } = parseListParams(requestUrl);
    const role = requestUrl.searchParams.get('role');
    const year = Number(requestUrl.searchParams.get('year'));

    let users = db.users.map(publicUser);
    if (role) users = users.filter(user => user.role === role);
    if (!Number.isNaN(year) && year) {
      users = users.filter(user => new Date(user.createdAt).getFullYear() === year);
    }

    const sorted = sortItems(users, { field: 'createdAt', direction: 'asc' });

    return HttpResponse.json({
      data: paginate(sorted, { page: pagination.page, limit: Math.max(pagination.limit, 500) }),
      metadata: buildMeta(sorted.length, pagination),
    });
  }),

  http.get(url('/user/employer/analytics'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const { pagination } = parseListParams(new URL(request.url));
    const page = paginate(db.employerProfiles, pagination);

    const data = page.map(employer => {
      const user = db.users.find(item => item.id === employer.userId)!;
      const vacancyIds = db.vacancies
        .filter(vacancy => vacancy.createdById === employer.id)
        .map(vacancy => vacancy.id);

      const practices = db.experiences.filter(
        experience => experience.vacancyId && vacancyIds.includes(experience.vacancyId) && experience.generatedBySystem,
      );

      return {
        id: employer.id,
        companyName: employer.companyName,
        city: employer.city,
        createdAt: employer.createdAt,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        status: user.status,
        activeVacancies: db.vacancies.filter(
          vacancy => vacancy.createdById === employer.id && vacancy.status === Status.APPROVED,
        ).length,
        studentsInPractice: practices.filter(
          practice => practice.type === 'TRAINING' && practice.practiceStatus !== PracticeStatus.COMPLETED,
        ).length,
        studentsInWork: practices.filter(
          practice => practice.type === 'WORK' && practice.practiceStatus !== PracticeStatus.COMPLETED,
        ).length,
      };
    });

    return HttpResponse.json({ data, metadata: buildMeta(db.employerProfiles.length, pagination) });
  }),

  http.get(url('/user/employer/:id/details'), async ({ request, params }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const employer = db.employerProfiles.find(item => item.id === String(params.id));
    if (!employer) return HttpResponse.json({ message: 'Employer not found' }, { status: 404 });

    const user = db.users.find(item => item.id === employer.userId)!;
    const vacancies = db.vacancies.filter(vacancy => vacancy.createdById === employer.id);

    const detailed = vacancies.map(vacancy => {
      const participants = db.bookings
        .filter(booking => booking.vacancyId === vacancy.id)
        .flatMap(booking => {
          const profile = db.studentProfiles.find(item => item.id === booking.studentId);
          if (!profile) return [];

          const student = userOf(profile);

          return db.experiences
            .filter(
              experience => experience.studentId === booking.studentId && experience.vacancyId === vacancy.id,
            )
            .map(experience => ({
              studentId: profile.id,
              studentUserId: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              profileImage: student.profileImage,
              bookingStatus: booking.status,
              workType: booking.workType,
              experienceId: experience.id,
              practiceStatus: experience.practiceStatus,
              gradePractice: experience.gradePractice,
            }));
        });

      return { ...vacancy, isActive: vacancy.status === Status.APPROVED, participants };
    });

    return HttpResponse.json({
      ...employer,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
      status: user.status,
      activeVacanciesCount: detailed.filter(vacancy => vacancy.isActive).length,
      inactiveVacanciesCount: detailed.filter(vacancy => !vacancy.isActive).length,
      totalParticipants: detailed.reduce((sum, vacancy) => sum + vacancy.participants.length, 0),
      vacancies: detailed,
    });
  }),

  http.get(url('/user/employer'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    const employer = db.employerProfiles.find(item => item.userId === user?.id);

    if (!employer) return HttpResponse.json({ message: 'Profile not found' }, { status: 404 });

    return HttpResponse.json({ ...employer, user: publicUser(user!) });
  }),

  http.patch(url('/user/employer'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    const employer = db.employerProfiles.find(item => item.userId === user?.id);

    if (!employer) return HttpResponse.json({ message: 'Profile not found' }, { status: 404 });

    Object.assign(employer, await request.json());

    return HttpResponse.json(commit(employer));
  }),

  http.get(url('/user/employer/logos'), async () => {
    await mockDelay();

    return HttpResponse.json(
      db.employerProfiles.slice(0, 8).map(employer => ({
        companyName: employer.companyName,
        logo: db.users.find(user => user.id === employer.userId)?.profileImage ?? null,
      })),
    );
  }),

  http.patch(url('/user/change-status'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const { userId, status } = (await request.json()) as { userId: string; status: Status };
    const target = db.users.find(item => item.id === userId);
    if (!target) return HttpResponse.json({ message: 'User not found' }, { status: 404 });

    target.status = status;
    target.updatedAt = new Date().toISOString();

    // Approving a user opens their chat with the admins — a side effect of the
    // real endpoint that is easy to miss and very visible in the UI.
    if (status === Status.APPROVED && target.role !== Role.ADMIN) {
      const adminIds = db.users.filter(item => item.role === Role.ADMIN).map(item => item.id);
      const exists = db.chats.some(
        chat => chat.type === ChatType.USER_WITH_ADMINS && chat.participantIds.includes(target.id),
      );

      if (!exists) {
        db.chats.push({
          id: crypto.randomUUID(),
          type: ChatType.USER_WITH_ADMINS,
          createdAt: new Date().toISOString(),
          participantIds: [target.id, ...adminIds],
        });
      }
    }

    return HttpResponse.json(commit(publicUser(target)));
  }),

  http.get(url('/user'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const { filters, sorting, pagination } = parseListParams(new URL(request.url));
    let users = db.users.map(publicUser);

    const role = findFilter(filters, 'role');
    if (role) users = users.filter(user => user.role === role);

    const status = findFilter(filters, 'status');
    if (status) users = users.filter(user => user.status === status);

    const email = findFilter(filters, 'email');
    if (typeof email === 'string') {
      users = users.filter(user => user.email.toLowerCase().includes(email.toLowerCase()));
    }

    for (const field of ['firstName', 'lastName'] as const) {
      const value = findFilter(filters, field);
      if (typeof value === 'string') {
        users = users.filter(user => user[field].toLowerCase().includes(value.toLowerCase()));
      }
    }

    const sorted = sortItems(users, sorting);

    return HttpResponse.json({
      users: paginate(sorted, pagination),
      metadata: buildMeta(sorted.length, pagination),
    });
  }),
];

export const notificationHandlers = [
  http.get(url('/user-notification/total-unread'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const total = db.notifications.filter(notification =>
      notification.recipients.some(recipient => recipient.userId === user.id && !recipient.isRead),
    ).length;

    return HttpResponse.json({ total });
  }),

  http.get(url('/user-notification/my'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { pagination } = parseListParams(new URL(request.url));

    const mine = db.notifications
      .filter(notification => notification.recipients.some(recipient => recipient.userId === user.id))
      .map(notification => {
        const brief = (id: string | null) => {
          const found = id ? db.users.find(item => item.id === id) : null;
          return found
            ? {
                id: found.id,
                firstName: found.firstName,
                lastName: found.lastName,
                role: found.role,
                profileImage: found.profileImage,
              }
            : null;
        };

        const vacancy = notification.vacancyId
          ? db.vacancies.find(item => item.id === notification.vacancyId)
          : null;

        return {
          id: notification.id,
          type: notification.type,
          createdAt: notification.createdAt,
          isRead: notification.recipients.find(recipient => recipient.userId === user.id)!.isRead,
          actor: brief(notification.actorId),
          subjectUser: brief(notification.subjectUserId),
          vacancy: vacancy ? { id: vacancy.id, company: vacancy.company } : null,
          meta: notification.meta,
        };
      });

    const sorted = sortItems(mine, undefined);

    return HttpResponse.json({
      notifications: paginate(sorted, pagination),
      metadata: buildMeta(sorted.length, pagination),
    });
  }),

  http.patch(url('/user-notification/read'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { notificationIds } = (await request.json()) as { notificationIds?: string[] };

    db.notifications.forEach(notification => {
      if (notificationIds?.length && !notificationIds.includes(notification.id)) return;

      notification.recipients.forEach(recipient => {
        if (recipient.userId === user.id) recipient.isRead = true;
      });
    });

    return HttpResponse.json(commit({ success: true }));
  }),
];
