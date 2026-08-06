/**
 * The API takes `filters`, `sorting` and `pagination` as JSON strings in the query
 * string. Building them by hand at each call site is how they drift apart, so every
 * list request goes through here.
 */

export type FilterValue = string | number | boolean | string[] | { from?: string; to?: string };

export type Filter = { field: string; value: FilterValue };

export type SortDirection = 'asc' | 'desc';

export type Sorting = { field: string; direction: SortDirection };

export type Pagination = { page: number; limit: number };

export type ListQuery = {
  filters?: Filter[];
  sorting?: Sorting;
  pagination?: Pagination;
};

export const DEFAULT_PAGINATION: Pagination = { page: 1, limit: 20 };

/**
 * The API rejects an empty `filters` array (`@IsNotEmpty`), so "no filters" has to
 * be expressed as a filter that matches everything. An age range wide enough to
 * cover every plausible user is the cheapest such no-op that every list accepts.
 */
export const NO_OP_FILTER: Filter = { field: 'age', value: { from: '14', to: '99' } };

export const buildListParams = ({ filters, sorting, pagination }: ListQuery): URLSearchParams => {
  const params = new URLSearchParams();
  const effectiveFilters = filters?.length ? filters : [NO_OP_FILTER];

  params.set('filters', JSON.stringify(effectiveFilters));

  if (sorting) {
    params.set('sorting', JSON.stringify(sorting));
  }

  params.set('pagination', JSON.stringify(pagination ?? DEFAULT_PAGINATION));

  return params;
};

/** Drops filters whose value is empty, so an untouched form control adds no constraint. */
export const compactFilters = (filters: (Filter | null | undefined)[]): Filter[] =>
  filters.filter((filter): filter is Filter => {
    if (!filter) return false;

    const { value } = filter;
    if (value === '' || value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Boolean(value.from || value.to);

    return true;
  });
