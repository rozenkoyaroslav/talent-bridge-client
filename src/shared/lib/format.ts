import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (value?: string | null) =>
  value ? format(parseISO(value), 'd MMM yyyy') : '—';

export const formatDateTime = (value?: string | null) =>
  value ? format(parseISO(value), 'd MMM yyyy, HH:mm') : '—';

export const fromNow = (value?: string | null) =>
  value ? formatDistanceToNow(parseISO(value), { addSuffix: true }) : '';

export const initials = (firstName?: string, lastName?: string) =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';

export const fullName = (person?: { firstName?: string; lastName?: string } | null) =>
  person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : 'Unknown';

/** Enum values reach the UI as SCREAMING_SNAKE; nobody wants to read that. */
export const humanize = (value?: string | null) =>
  value ? value.toLowerCase().replace(/_/g, ' ').replace(/^./, char => char.toUpperCase()) : '—';

export const yearsOld = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return null;
  const years = (Date.now() - parseISO(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.floor(years);
};
