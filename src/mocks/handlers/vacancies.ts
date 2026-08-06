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
import { Role, Status, type Vacancy } from '@/entities/types';
import { API_PREFIX } from '@/shared/api/http';
import { openConversation } from './chat';

const url = (path: string) => `*${API_PREFIX}${path}`;

const applyVacancyFilters = (
  vacancies: Vacancy[],
  filters: ReturnType<typeof parseListParams>['filters'],
) => {
  let result = vacancies;

  const specialization = findFilter(filters, 'specialization');
  if (specialization) {
    const wanted = Array.isArray(specialization) ? specialization : [specialization];
    result = result.filter(vacancy => wanted.includes(vacancy.specializationId));
  }

  const location = findFilter(filters, 'location');
  if (location) result = result.filter(vacancy => vacancy.location === location);

  const candidateStatus = findFilter(filters, 'candidateStatus');
  if (candidateStatus) {
    const wanted = Array.isArray(candidateStatus) ? candidateStatus : [candidateStatus];
    result = result.filter(vacancy => wanted.includes(vacancy.candidateStatus));
  }

  const status = findFilter(filters, 'status');
  if (status) result = result.filter(vacancy => vacancy.status === status);

  return result;
};

export const vacancyHandlers = [
  http.get(url('/vacancy/my-vacancies'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const employer = employerByUserId(user!.id);
    const vacancies = db.vacancies.filter(vacancy => vacancy.createdById === employer?.id);

    return HttpResponse.json(vacancies.map(vacancy => vacancyWithEmployer(vacancy.id)));
  }),

  http.get(url('/vacancy'), async ({ request }) => {
    await mockDelay();
    const viewer = currentUser(request);
    const { filters, sorting, pagination } = parseListParams(new URL(request.url));

    // Students only ever see approved vacancies; admins moderate the rest.
    const visible =
      viewer?.role === Role.ADMIN
        ? db.vacancies
        : db.vacancies.filter(vacancy => vacancy.status === Status.APPROVED);

    const filtered = applyVacancyFilters(visible, filters);
    const sorted = sortItems(filtered, sorting);

    return HttpResponse.json({
      vacancies: paginate(sorted, pagination).map(vacancy => vacancyWithEmployer(vacancy.id)),
      metadata: buildMeta(sorted.length, pagination),
    });
  }),

  http.post(url('/vacancy'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const employer = employerByUserId(user!.id)!;
    const body = (await request.json()) as Record<string, string>;
    const now = new Date().toISOString();
    const specialization = db.specializations.find(item => item.id === body.specialization);

    const vacancy: Vacancy = {
      id: `vacancy-${crypto.randomUUID()}`,
      specializationId: body.specialization,
      specialization: specialization!,
      candidateStatus: body.candidateStatus as never,
      company: body.company || employer.companyName,
      location: body.location as never,
      description: body.description,
      // New vacancies wait for moderation, exactly as on the API.
      status: Status.PENDING,
      createdById: employer.id,
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
    };

    db.vacancies.push(vacancy);

    return HttpResponse.json(commit(vacancy), { status: 201 });
  }),

  http.patch(url('/vacancy/change-status'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const { vacancyId, status } = (await request.json()) as { vacancyId: string; status: Status };
    const vacancy = db.vacancies.find(item => item.id === vacancyId);
    if (!vacancy) return HttpResponse.json({ message: 'Vacancy not found' }, { status: 404 });

    vacancy.status = status;
    vacancy.approvedAt = status === Status.APPROVED ? new Date().toISOString() : null;
    vacancy.updatedAt = new Date().toISOString();

    return HttpResponse.json(commit(vacancy));
  }),

  http.patch(url('/vacancy/:vacancyId'), async ({ request, params }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const vacancy = db.vacancies.find(item => item.id === String(params.vacancyId));
    if (!vacancy) return HttpResponse.json({ message: 'Vacancy not found' }, { status: 404 });

    const body = (await request.json()) as Record<string, string>;
    Object.assign(vacancy, body, { updatedAt: new Date().toISOString() });

    if (body.specialization) {
      vacancy.specializationId = body.specialization;
      vacancy.specialization = db.specializations.find(item => item.id === body.specialization)!;
    }

    return HttpResponse.json(commit(vacancy));
  }),

  http.delete(url('/vacancy/:vacancyId'), async ({ request, params }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const index = db.vacancies.findIndex(item => item.id === String(params.vacancyId));
    if (index === -1) return HttpResponse.json({ message: 'Vacancy not found' }, { status: 404 });

    const [removed] = db.vacancies.splice(index, 1);

    return HttpResponse.json(commit(removed));
  }),
];

export const responseHandlers = [
  http.post(url('/student-vacancy-response'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.STUDENT);
    if (error) return error;

    const profile = profileByUserId(user!.id);
    if (profile?.profileStatus !== Status.APPROVED) {
      return HttpResponse.json({ message: 'Student profile is not approved' }, { status: 400 });
    }

    const body = (await request.json()) as { vacancyId: string; workType: never; message?: string };

    if (db.responses.some(r => r.studentId === profile.id && r.vacancyId === body.vacancyId)) {
      return HttpResponse.json(
        { message: 'You already submitted a response for this vacancy.' },
        { status: 409 },
      );
    }

    const vacancy = db.vacancies.find(item => item.id === body.vacancyId);
    if (!vacancy) return HttpResponse.json({ message: 'Vacancy not found' }, { status: 404 });

    const response = {
      studentId: profile.id,
      vacancyId: body.vacancyId,
      workType: body.workType,
      statusByEmployer: Status.PENDING,
      createdAt: new Date().toISOString(),
    };
    db.responses.push(response);

    // Responding opens the conversation with the employer, as the API does.
    const employer = db.employerProfiles.find(item => item.id === vacancy.createdById);
    if (employer) openConversation(user!.id, employer.userId, body.message);

    return HttpResponse.json(commit(response), { status: 201 });
  }),

  http.get(url('/student-vacancy-response/my-responses'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.STUDENT);
    if (error) return error;

    const profile = profileByUserId(user!.id);
    const { pagination } = parseListParams(new URL(request.url));
    const items = db.responses
      .filter(response => response.studentId === profile?.id)
      .map(response => ({ ...response, vacancy: vacancyWithEmployer(response.vacancyId) }));

    const sorted = sortItems(items, undefined);

    return HttpResponse.json({
      responses: paginate(sorted, pagination),
      metadata: buildMeta(sorted.length, pagination),
    });
  }),

  http.get(url('/student-vacancy-response/received'), async ({ request }) => {
    await mockDelay();
    const { user, error } = requireRole(request, Role.EMPLOYER);
    if (error) return error;

    const employer = employerByUserId(user!.id);
    const { pagination } = parseListParams(new URL(request.url));

    const items = db.responses
      .filter(response =>
        db.vacancies.some(v => v.id === response.vacancyId && v.createdById === employer?.id),
      )
      .map(response => {
        const profile = db.studentProfiles.find(item => item.id === response.studentId)!;
        return {
          ...response,
          vacancy: vacancyWithEmployer(response.vacancyId),
          student: { ...profile, user: userOf(profile) },
        };
      });

    const sorted = sortItems(items, undefined);

    return HttpResponse.json({
      responses: paginate(sorted, pagination),
      metadata: buildMeta(sorted.length, pagination),
    });
  }),

  http.patch(url('/student-vacancy-response/status'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.EMPLOYER, Role.ADMIN);
    if (error) return error;

    const { studentId, vacancyId, statusByEmployer } = (await request.json()) as {
      studentId: string;
      vacancyId: string;
      statusByEmployer: Status;
    };

    const response = db.responses.find(
      item => item.studentId === studentId && item.vacancyId === vacancyId,
    );
    if (!response) return HttpResponse.json({ message: 'Response not found' }, { status: 404 });

    response.statusByEmployer = statusByEmployer;

    return HttpResponse.json(commit(response));
  }),

  http.delete(url('/student-vacancy-response/:vacancyId/:studentId'), async ({ params }) => {
    await mockDelay();
    const index = db.responses.findIndex(
      item => item.vacancyId === String(params.vacancyId) && item.studentId === String(params.studentId),
    );
    if (index === -1) return HttpResponse.json({ message: 'Response not found' }, { status: 404 });

    const [removed] = db.responses.splice(index, 1);

    return HttpResponse.json(commit(removed));
  }),
];
