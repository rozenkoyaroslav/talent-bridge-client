import { http, HttpResponse } from 'msw';
import { db, DEMO_PASSWORD, persistDb } from '../db';
import {
  ACCESS_TTL,
  commit,
  createToken,
  currentUser,
  employerByUserId,
  mockDelay,
  profileByUserId,
  publicUser,
  readToken,
} from '../helpers';
import { Role, Status } from '@/entities/types';
import { API_PREFIX } from '@/shared/api/http';

const url = (path: string) => `*${API_PREFIX}${path}`;

/**
 * The real API keeps the refresh token in an httpOnly cookie the client never reads.
 * A Service Worker cannot set one, so the mock stores the refresh token here and
 * `/auth/refresh` reads it from this module — the client-side contract is unchanged:
 * it still gets only an access token, and still cannot see the refresh token.
 */
let refreshToken: string | null = null;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;
const SESSION_KEY = 'talent-bridge-demo-session';

if (typeof sessionStorage !== 'undefined') {
  refreshToken = sessionStorage.getItem(SESSION_KEY);
}

const setSession = (userId: string | null) => {
  refreshToken = userId ? createToken(userId, REFRESH_TTL) : null;

  if (typeof sessionStorage === 'undefined') return;

  if (refreshToken) sessionStorage.setItem(SESSION_KEY, refreshToken);
  else sessionStorage.removeItem(SESSION_KEY);
};

const authPayload = (userId: string) => {
  const user = db.users.find(item => item.id === userId)!;
  setSession(userId);

  return {
    accessToken: createToken(userId, ACCESS_TTL),
    user: {
      ...publicUser(user),
      studentProfile: profileByUserId(userId),
      employerProfile: employerByUserId(userId),
    },
  };
};

export const authHandlers = [
  http.post(url('/auth/login'), async ({ request }) => {
    await mockDelay();
    const { email, password } = (await request.json()) as { email: string; password: string };

    const user = db.users.find(item => item.email.toLowerCase() === email.trim().toLowerCase());

    if (!user || (password !== user.password && password !== DEMO_PASSWORD)) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 });
    }

    // Mirrors the API: an unapproved account authenticates but is refused entry.
    if (user.status !== Status.APPROVED) {
      return HttpResponse.json(
        { message: 'User must be approved by an administrator', statusCode: 403 },
        { status: 403 },
      );
    }

    return HttpResponse.json(authPayload(user.id));
  }),

  http.post(url('/auth/refresh'), async () => {
    await mockDelay();
    const userId = readToken(refreshToken);

    if (!userId) {
      return HttpResponse.json({ message: 'Refresh token not found' }, { status: 401 });
    }

    return HttpResponse.json(authPayload(userId));
  }),

  http.post(url('/auth/logout'), async () => {
    await mockDelay();
    setSession(null);
    return HttpResponse.json({ success: true });
  }),

  http.post(url('/auth/register/student'), async ({ request }) => {
    await mockDelay();
    const body = (await request.json()) as Record<string, string>;

    if (db.users.some(user => user.email.toLowerCase() === body.email?.toLowerCase())) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    const id = `user-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.users.push({
      id,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      patronymic: body.patronymic ?? null,
      password: body.password,
      role: Role.STUDENT,
      status: Status.PENDING,
      profileImage: null,
      createdAt: now,
      updatedAt: now,
    });

    db.studentProfiles.push({
      id: `profile-${id}`,
      userId: id,
      profileStatus: Status.PENDING,
      status: (body.status as never) ?? null,
      specializationId: body.specializationId ?? null,
      specialization:
        db.specializations.find(item => item.id === body.specializationId) ?? null,
      city: null,
      dateOfBirth: null,
      experience: null,
      aboutMe: null,
      diplomaGrade: null,
      diplomaTopic: null,
      cv: null,
      interview: null,
      isLookingForJob: false,
      isLookingForPractice: false,
      createdAt: now,
      approvedAt: null,
    });

    return HttpResponse.json(commit(authPayload(id)), { status: 201 });
  }),

  http.post(url('/auth/register/employer'), async ({ request }) => {
    await mockDelay();
    const form = await request.formData();
    const value = (key: string) => String(form.get(key) ?? '');

    if (db.users.some(user => user.email.toLowerCase() === value('email').toLowerCase())) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    const id = `user-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.users.push({
      id,
      email: value('email'),
      firstName: value('firstName'),
      lastName: value('lastName'),
      patronymic: null,
      password: value('password'),
      role: Role.EMPLOYER,
      status: Status.PENDING,
      profileImage: null,
      createdAt: now,
      updatedAt: now,
    });

    db.employerProfiles.push({
      id: `employer-${id}`,
      userId: id,
      companyName: value('companyName'),
      city: value('city'),
      phoneNumber: value('phoneNumber') || null,
      workPosition: value('workPosition') || null,
      createdAt: now,
    });

    return HttpResponse.json(commit(authPayload(id)), { status: 201 });
  }),

  http.patch(url('/auth/change-password'), async ({ request }) => {
    await mockDelay();
    const user = currentUser(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { oldPassword, newPassword } = (await request.json()) as Record<string, string>;

    if (oldPassword !== user.password && oldPassword !== DEMO_PASSWORD) {
      return HttpResponse.json({ message: 'Old password is incorrect' }, { status: 400 });
    }

    user.password = newPassword;
    persistDb();

    return HttpResponse.json({ message: 'Password has been successfully changed' });
  }),

  // Deliberately identical whether or not the address exists — the API does not
  // disclose which emails are registered, and neither should the demo.
  http.post(url('/auth/forgot-password'), async () => {
    await mockDelay();
    return HttpResponse.json({
      message: 'If this email exists, a password reset link has been sent',
    });
  }),

  http.patch(url('/auth/reset-password'), async () => {
    await mockDelay();
    return HttpResponse.json({ message: 'Password has been successfully reset' });
  }),
];
