import { NotificationType, type NotificationItem } from '@/entities/types';
import { fullName } from '@/shared/lib/format';

/**
 * The API sends a type plus a few relations and lets the client phrase it. A table
 * keyed by type keeps all eleven wordings in one readable place instead of a switch
 * buried in the notification list component.
 */
type Rendered = { text: string; href?: string };

const NOTIFICATION_TEMPLATES: Record<NotificationType, (item: NotificationItem) => Rendered> = {
  [NotificationType.USER_AWAITS_APPROVAL]: item => ({
    text: `${fullName(item.actor)} registered and is waiting for approval.`,
    href: '/admin/users',
  }),
  [NotificationType.PROFILE_AWAITS_APPROVAL]: item => ({
    text: `${fullName(item.actor)} updated their profile and it needs review.`,
    href: '/admin/students',
  }),
  [NotificationType.VACANCY_AWAITS_APPROVAL]: item => ({
    text: `A vacancy from ${item.vacancy?.company ?? 'an employer'} is waiting for approval.`,
    href: '/admin/vacancies',
  }),
  [NotificationType.EMPLOYER_RESPONSE_TO_CANDIDATE]: item => ({
    text: `${fullName(item.actor)} booked ${fullName(item.subjectUser)} for a vacancy.`,
    href: '/admin/bookings',
  }),
  [NotificationType.VACANCY_UPDATED]: item => ({
    text: `The vacancy at ${item.vacancy?.company ?? 'an employer'} was updated.`,
    href: '/vacancies',
  }),
  [NotificationType.VACANCY_DELETED]: item => ({
    text: `The vacancy at ${item.vacancy?.company ?? 'an employer'} was removed.`,
  }),
  [NotificationType.NEW_VACANCIES_DIGEST]: item => ({
    text: `${item.meta?.count ?? 'Several'} new vacancies in ${item.meta?.specialization ?? 'your field'}.`,
    href: '/vacancies',
  }),
  [NotificationType.NEW_VACANCIES_FOR_STUDENT]: item => ({
    text: `New vacancy at ${item.vacancy?.company ?? 'an employer'} matches your specialization.`,
    href: '/vacancies',
  }),
  [NotificationType.CANDIDATE_BOOKING_CONFIRMED]: item => ({
    text: `${fullName(item.subjectUser)}'s booking was ${String(item.meta?.status ?? 'updated').toLowerCase()}.`,
    href: '/bookings',
  }),
  [NotificationType.NEW_CANDIDATES_DIGEST]: item => ({
    text: `${item.meta?.count ?? 'Several'} new candidate profiles were approved.`,
    href: '/admin/students',
  }),
  [NotificationType.VACANCY_RESPONSE]: item => ({
    text: `${fullName(item.actor)} responded to the vacancy at ${item.vacancy?.company ?? 'your company'}.`,
    href: '/responses',
  }),
};

export const renderNotification = (item: NotificationItem): Rendered =>
  NOTIFICATION_TEMPLATES[item.type]?.(item) ?? { text: item.type };
