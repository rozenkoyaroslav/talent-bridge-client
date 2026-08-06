import { http, HttpResponse } from 'msw';
import { db, persistDb } from '../db';
import {
  buildMeta,
  commit,
  currentUser,
  findFilter,
  fullStudent,
  mockDelay,
  paginate,
  parseListParams,
  profileByUserId,
  requireRole,
  sortItems,
  studentListItem,
} from '../helpers';
import { Role, Status, WorkType, type StudentProfile } from '@/entities/types';
import { API_PREFIX } from '@/shared/api/http';

const url = (path: string) => `*${API_PREFIX}${path}`;

const yearsOfExperience = (studentId: string) => {
  const days = db.experiences
    .filter(
      experience =>
        experience.studentId === studentId &&
        experience.type === WorkType.WORK &&
        experience.dateFrom &&
        (experience.practiceStatus === 'COMPLETED' || experience.practiceStatus === null),
    )
    .reduce((total, experience) => {
      const from = new Date(experience.dateFrom!).getTime();
      const to = experience.dateTo ? new Date(experience.dateTo).getTime() : Date.now();
      return total + Math.max(0, (to - from) / 86_400_000);
    }, 0);

  return days / 365;
};

/**
 * Filtering is evaluated for real rather than stubbed: the filter layer is the part
 * of this UI worth demonstrating, and a mock that ignores it would demo nothing.
 */
const applyStudentFilters = (profiles: StudentProfile[], filters: ReturnType<typeof parseListParams>['filters']) => {
  let result = profiles;

  const age = findFilter(filters, 'age') as { from?: string; to?: string } | undefined;
  if (age) {
    const now = Date.now();
    const years = (birth: string) => (now - new Date(birth).getTime()) / (365.25 * 86_400_000);

    result = result.filter(profile => {
      if (!profile.dateOfBirth) return false;
      const value = years(profile.dateOfBirth);
      const from = Number(age.from);
      const to = Number(age.to);

      if (!Number.isNaN(from) && value < from) return false;
      if (!Number.isNaN(to) && value > to) return false;

      return true;
    });
  }

  const specialization = findFilter(filters, 'specialization');
  if (specialization) {
    result = result.filter(profile => profile.specializationId === specialization);
  }

  const city = findFilter(filters, 'city');
  if (city) result = result.filter(profile => profile.city === city);

  const status = findFilter(filters, 'status');
  if (status) {
    const allowed = Array.isArray(status) ? status : [status];
    result = result.filter(profile => allowed.includes(profile.status as string));
  }

  const profileStatus = findFilter(filters, 'profileStatus');
  if (profileStatus) {
    result = result.filter(profile => profile.profileStatus === profileStatus);
  }

  const lookingForJob = findFilter(filters, 'isLookingForJob');
  if (lookingForJob !== undefined) {
    result = result.filter(profile => profile.isLookingForJob === (lookingForJob === true || lookingForJob === 'true'));
  }

  const lookingForPractice = findFilter(filters, 'isLookingForPractice');
  if (lookingForPractice !== undefined) {
    result = result.filter(
      profile => profile.isLookingForPractice === (lookingForPractice === true || lookingForPractice === 'true'),
    );
  }

  const types = findFilter(filters, 'type') as string[] | undefined;
  if (types?.length) {
    const wanted = types.map(type => type.toUpperCase());
    result = result.filter(profile =>
      db.experiences.some(
        experience => experience.studentId === profile.id && experience.type && wanted.includes(experience.type),
      ),
    );
  }

  const experience = findFilter(filters, 'experience') as string[] | undefined;
  if (experience?.length) {
    const minimum = Number(experience[0]);
    if (!Number.isNaN(minimum)) {
      result = result.filter(profile => yearsOfExperience(profile.id) >= minimum);
    }
  }

  return result;
};

const listStudents = (request: Request, { adminView }: { adminView: boolean }) => {
  const { filters, sorting, pagination } = parseListParams(new URL(request.url));
  const viewer = currentUser(request);

  let profiles = db.studentProfiles.filter(profile => {
    const user = db.users.find(item => item.id === profile.userId);
    return user?.status === Status.APPROVED;
  });

  if (!adminView) {
    profiles = profiles.filter(profile => profile.profileStatus === Status.APPROVED);

    // Employers never see candidates they have already engaged with.
    const employer = db.employerProfiles.find(item => item.userId === viewer?.id);
    if (employer) {
      const engaged = new Set([
        ...db.responses
          .filter(response => db.vacancies.some(v => v.id === response.vacancyId && v.createdById === employer.id))
          .map(response => response.studentId),
        ...db.bookings
          .filter(booking => db.vacancies.some(v => v.id === booking.vacancyId && v.createdById === employer.id))
          .map(booking => booking.studentId),
      ]);

      profiles = profiles.filter(profile => !engaged.has(profile.id));
    }
  }

  const filtered = applyStudentFilters(profiles, filters);
  const sorted = sortItems(
    filtered.map(studentListItem),
    sorting?.field === 'age' ? { field: 'dateOfBirth', direction: sorting.direction } : sorting,
  );

  return HttpResponse.json({
    students: paginate(sorted, pagination),
    metadata: buildMeta(sorted.length, pagination),
  });
};

export const studentHandlers = [
  http.get(url('/user/student/admin/get-many'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    return listStudents(request, { adminView: true });
  }),

  http.get(url('/user/student'), async ({ request }) => {
    await mockDelay();
    return listStudents(request, { adminView: false });
  }),

  http.get(url('/user/student/:userId'), async ({ params }) => {
    await mockDelay();
    const profile = profileByUserId(String(params.userId));

    if (!profile) return HttpResponse.json({ message: 'Student not found' }, { status: 404 });

    return HttpResponse.json(fullStudent(profile));
  }),

  http.patch(url('/user/student'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const profile = profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Profile not found' }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    const { educations, languages, workExperience, skill, firstName, lastName, patronymic, ...rest } =
      body;

    if (typeof firstName === 'string') user.firstName = firstName;
    if (typeof lastName === 'string') user.lastName = lastName;
    if (typeof patronymic === 'string') user.patronymic = patronymic;

    Object.assign(profile, rest);

    if (typeof rest.specialization === 'string') {
      profile.specializationId = rest.specialization;
      profile.specialization = db.specializations.find(item => item.id === rest.specialization) ?? null;
      delete (profile as Record<string, unknown>).specialization_;
    }

    // Editing a profile sends it back for moderation — same rule as the API.
    profile.profileStatus = Status.PENDING;
    profile.approvedAt = null;

    const replace = <T extends { id: string }>(
      collection: (T & { studentId: string })[],
      incoming: unknown,
      map: (item: Record<string, unknown>) => Omit<T, 'id'>,
    ) => {
      if (!Array.isArray(incoming)) return;

      for (let i = collection.length - 1; i >= 0; i--) {
        if (collection[i].studentId === profile.id) collection.splice(i, 1);
      }

      incoming.forEach(item => {
        collection.push({
          ...(map(item as Record<string, unknown>) as T),
          id: crypto.randomUUID(),
          studentId: profile.id,
        } as T & { studentId: string });
      });
    };

    replace(db.educations, educations, item => ({
      educationalInstitution: String(item.educationalInstitution ?? ''),
      degree: String(item.degree ?? ''),
      specialization: String(item.specialization ?? ''),
      dateFrom: (item.dateFrom as string) ?? null,
      dateTo: (item.dateTo as string) ?? null,
      stillStudying: Boolean(item.stillStudying),
    }));

    replace(db.languages, languages, item => ({
      name: String(item.name ?? ''),
      level: String(item.level ?? ''),
    }));

    if (Array.isArray(workExperience)) {
      // Only self-reported rows are replaceable; platform-generated practices stay.
      for (let i = db.experiences.length - 1; i >= 0; i--) {
        const experience = db.experiences[i];
        if (experience.studentId === profile.id && !experience.generatedBySystem) {
          db.experiences.splice(i, 1);
        }
      }

      workExperience.forEach(item => {
        const entry = item as Record<string, unknown>;
        db.experiences.push({
          id: crypto.randomUUID(),
          studentId: profile.id,
          company: String(entry.company ?? ''),
          specialization: String(entry.specialization ?? ''),
          dateFrom: (entry.dateFrom as string) ?? null,
          dateTo: (entry.dateTo as string) ?? null,
          stillWorking: Boolean(entry.stillWorking),
          type: (entry.type as never) ?? WorkType.WORK,
          generatedBySystem: false,
          practiceStatus: null,
          approvedStartByStudent: null,
          approvedStartByEmployer: null,
          approvedEndByStudent: null,
          approvedEndByEmployer: null,
          gradePractice: null,
          feedback: null,
          vacancyId: null,
        });
      });
    }

    if (skill && typeof skill === 'object') {
      const incoming = skill as Record<string, unknown>;
      const existing = db.skills.find(item => item.studentId === profile.id);
      const next = {
        techSkill: String(incoming.techSkill ?? ''),
        flexibleSkill: String(incoming.flexibleSkill ?? ''),
        keySkills: (incoming.keySkills as string[]) ?? [],
      };

      if (existing) Object.assign(existing, next);
      else db.skills.push({ id: crypto.randomUUID(), studentId: profile.id, ...next });
    }

    return HttpResponse.json(commit(fullStudent(profile)));
  }),

  http.patch(url('/user/student/change-profile-status'), async ({ request }) => {
    await mockDelay();
    const { error } = requireRole(request, Role.ADMIN);
    if (error) return error;

    const { studentId, status } = (await request.json()) as { studentId: string; status: Status };
    const profile = db.studentProfiles.find(item => item.id === studentId);

    if (!profile) return HttpResponse.json({ message: 'Profile not found' }, { status: 404 });

    profile.profileStatus = status;
    profile.approvedAt = status === Status.APPROVED ? new Date().toISOString() : null;

    return HttpResponse.json(commit(profile));
  }),

  http.patch(url('/user/student/looking-for-job/:value'), async ({ request, params }) => {
    await mockDelay();
    const user = currentUser(request);
    const profile = user && profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    profile.isLookingForJob = String(params.value) === 'true';
    return HttpResponse.json(commit(profile));
  }),

  http.patch(url('/user/student/looking-for-practice/:value'), async ({ request, params }) => {
    await mockDelay();
    const user = currentUser(request);
    const profile = user && profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    profile.isLookingForPractice = String(params.value) === 'true';
    return HttpResponse.json(commit(profile));
  }),

  http.patch(url('/user/student/delete-resume'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    const profile = user && profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    profile.cv = null;
    return HttpResponse.json(commit(profile));
  }),

  http.patch(url('/user/student/delete-interview'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    const profile = user && profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    profile.interview = null;
    return HttpResponse.json(commit(profile));
  }),

  http.get(url('/specialization'), async () => {
    await mockDelay();
    return HttpResponse.json(db.specializations);
  }),
];

export const studentFileHandlers = [
  http.patch(url('/user/student/upload-resume'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    const profile = user && profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    profile.cv = file instanceof File ? URL.createObjectURL(file) : 'demo://resume.pdf';
    persistDb();

    return HttpResponse.json({ cv: profile.cv });
  }),

  http.patch(url('/user/student/upload-video-interview'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    const profile = user && profileByUserId(user.id);
    if (!profile) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // One endpoint fails intermittently so error handling is demonstrable, not claimed.
    if (Math.random() < 0.33) {
      return HttpResponse.json({ message: 'Upload failed, please try again' }, { status: 500 });
    }

    const form = await request.formData();
    const file = form.get('file');
    profile.interview = file instanceof File ? URL.createObjectURL(file) : 'demo://interview.mp4';
    persistDb();

    return HttpResponse.json({ interview: profile.interview });
  }),

  http.patch(url('/user/upload-avatar'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    if (file instanceof File) user.profileImage = URL.createObjectURL(file);
    persistDb();

    return HttpResponse.json({ profileImage: user.profileImage });
  }),
];
