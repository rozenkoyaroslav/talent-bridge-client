import { delay, HttpResponse } from 'msw';
import { db, persistDb, type DbUser } from './db';
import type { Filter, Pagination, Sorting } from '@/shared/api/query-params';
import type { PaginationMeta } from '@/shared/api/paginated';
import { Role, Status, type StudentProfile, type User } from '@/entities/types';

/** Long enough for skeletons to be visible, short enough not to feel broken. */
export const mockDelay = () => delay(150 + Math.random() * 250);

export const parseListParams = (url: URL) => {
  const read = <T>(key: string, fallback: T): T => {
    const raw = url.searchParams.get(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    filters: read<Filter[]>('filters', []),
    sorting: read<Sorting | undefined>('sorting', undefined),
    pagination: read<Pagination>('pagination', { page: 1, limit: 20 }),
  };
};

export const findFilter = (filters: Filter[], field: string) =>
  filters.find(filter => filter.field === field)?.value;

export const buildMeta = (total: number, { page, limit }: Pagination): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    totalItems: total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const paginate = <T>(items: T[], { page, limit }: Pagination) =>
  items.slice((page - 1) * limit, (page - 1) * limit + limit);

/** Resolves a dotted path so sorting works on nested fields, as it does on the API. */
const valueAt = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[key];
    return undefined;
  }, source);

export const sortItems = <T>(items: T[], sorting: Sorting | undefined, fallbackField = 'createdAt') => {
  const field = sorting?.field ?? fallbackField;
  const direction = sorting?.direction ?? 'desc';

  return [...items].sort((a, b) => {
    const left = valueAt(a, field);
    const right = valueAt(b, field);

    if (left === right) return 0;
    if (left == null) return 1;
    if (right == null) return -1;

    const comparison = left > right ? 1 : -1;
    return direction === 'asc' ? comparison : -comparison;
  });
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Tokens are `mock.<userId>.<expiry>` — enough structure to expire and to identify
 * the caller, without pulling in a JWT library the demo would never use for real.
 */
export const createToken = (userId: string, ttlMs: number) =>
  `mock.${userId}.${Date.now() + ttlMs}`;

export const ACCESS_TTL = 15 * 60 * 1000;

export const readToken = (token: string | null): string | null => {
  if (!token?.startsWith('mock.')) return null;

  const [, userId, expiry] = token.split('.');
  if (!userId || Number(expiry) < Date.now()) return null;

  return userId;
};

export const currentUser = (request: Request): DbUser | null => {
  const header = request.headers.get('authorization');
  const userId = readToken(header?.replace(/^Bearer\s+/i, '') ?? null);

  return db.users.find(user => user.id === userId) ?? null;
};

export const requireUser = (request: Request) => {
  const user = currentUser(request);

  if (!user) {
    return { user: null, error: HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
};

export const requireRole = (request: Request, ...roles: Role[]) => {
  const { user, error } = requireUser(request);
  if (error) return { user: null, error };

  if (!roles.includes(user!.role)) {
    return { user: null, error: HttpResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }

  return { user, error: null };
};

// ---------------------------------------------------------------------------
// Shape helpers — the API returns composed objects, not raw rows
// ---------------------------------------------------------------------------

export const publicUser = (user: DbUser): User => {
  const { password: _password, ...rest } = user;
  return rest;
};

export const userOf = (profile: StudentProfile) =>
  publicUser(db.users.find(user => user.id === profile.userId)!);

/** Mean of completed, system-generated practice grades — the API computes this per request. */
export const averageGrade = (studentId: string) => {
  const grades = db.experiences
    .filter(
      experience =>
        experience.studentId === studentId &&
        experience.generatedBySystem &&
        experience.practiceStatus === 'COMPLETED' &&
        experience.gradePractice != null,
    )
    .map(experience => experience.gradePractice!);

  if (grades.length === 0) return 0;

  return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
};

export const activePractices = (studentId: string) =>
  db.experiences.filter(
    experience =>
      experience.studentId === studentId &&
      experience.generatedBySystem &&
      experience.approvedStartByStudent &&
      experience.approvedStartByEmployer &&
      (experience.practiceStatus === 'APPROVED' || experience.practiceStatus === 'PENDING'),
  );

export const studentListItem = (profile: StudentProfile) => ({
  ...profile,
  user: userOf(profile),
  workExperiences: activePractices(profile.id),
  averageGrade: averageGrade(profile.id),
});

export const fullStudent = (profile: StudentProfile) => ({
  ...userOf(profile),
  studentProfile: {
    ...profile,
    educations: db.educations.filter(education => education.studentId === profile.id),
    languages: db.languages.filter(language => language.studentId === profile.id),
    skill: db.skills.find(skill => skill.studentId === profile.id) ?? null,
    certificates: db.certificates.filter(certificate => certificate.studentId === profile.id),
    workExperiences: db.experiences.filter(experience => experience.studentId === profile.id),
    averageGrade: averageGrade(profile.id),
  },
});

export const vacancyWithEmployer = (vacancyId: string) => {
  const vacancy = db.vacancies.find(item => item.id === vacancyId);
  if (!vacancy) return null;

  const employer = db.employerProfiles.find(profile => profile.id === vacancy.createdById);
  const employerUser = employer && db.users.find(user => user.id === employer.userId);

  return {
    ...vacancy,
    createdBy: employer
      ? { ...employer, user: employerUser ? publicUser(employerUser) : null }
      : null,
  };
};

export const profileByUserId = (userId: string) =>
  db.studentProfiles.find(profile => profile.userId === userId) ?? null;

export const employerByUserId = (userId: string) =>
  db.employerProfiles.find(profile => profile.userId === userId) ?? null;

export const isApproved = (user: DbUser) => user.status === Status.APPROVED;

export const commit = <T>(value: T): T => {
  persistDb();
  return value;
};
