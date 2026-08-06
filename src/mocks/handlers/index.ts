import { authHandlers } from './auth';
import { studentFileHandlers, studentHandlers } from './students';
import { responseHandlers, vacancyHandlers } from './vacancies';
import { bookingHandlers, practiceHandlers } from './bookings';
import { adminHandlers, notificationHandlers } from './admin';
import { chatHandlers } from './chat';

/**
 * Order matters: MSW matches in sequence, so specific paths must come before the
 * collection routes that would otherwise swallow them (`/vacancy/my-vacancies`
 * before `/vacancy`, `/user/student/admin/get-many` before `/user/student/:userId`).
 */
export const handlers = [
  ...authHandlers,
  ...studentFileHandlers,
  ...studentHandlers,
  ...vacancyHandlers,
  ...responseHandlers,
  ...bookingHandlers,
  ...practiceHandlers,
  ...chatHandlers,
  ...notificationHandlers,
  ...adminHandlers,
];
