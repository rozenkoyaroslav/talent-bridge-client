/**
 * Every list endpoint returns the same `metadata` but names the array after the
 * resource (`students`, `vacancies`, `bookings`, `users`, `chatRequests`, …).
 * Normalising that here is what lets one set of list components serve every screen.
 */

export type PaginationMeta = {
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type Paginated<T> = {
  items: T[];
  metadata: PaginationMeta;
};

export const EMPTY_META: PaginationMeta = {
  totalItems: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

/**
 * Picks the array out of a list response without needing to know its key: takes the
 * declared key when present, otherwise the first array-valued property. The fallback
 * matters because a few endpoints (`data`, `bookings`) disagree with their resource name.
 */
export const toPaginated = <T>(response: unknown, key?: string): Paginated<T> => {
  if (!response || typeof response !== 'object') {
    return { items: [], metadata: EMPTY_META };
  }

  const record = response as Record<string, unknown>;
  const metadata = (record.metadata as PaginationMeta | undefined) ?? EMPTY_META;

  const fromKey = key ? record[key] : undefined;
  if (Array.isArray(fromKey)) {
    return { items: fromKey as T[], metadata };
  }

  const firstArray = Object.values(record).find(Array.isArray);

  return { items: (firstArray as T[]) ?? [], metadata };
};
