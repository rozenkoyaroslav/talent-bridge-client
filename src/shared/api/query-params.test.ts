import { describe, expect, it } from 'vitest';
import { buildListParams, compactFilters, NO_OP_FILTER } from './query-params';
import { toPaginated, EMPTY_META } from './paginated';

describe('buildListParams', () => {
  it('serialises each part as its own JSON query parameter', () => {
    const params = buildListParams({
      filters: [{ field: 'city', value: 'BERLIN' }],
      sorting: { field: 'createdAt', direction: 'desc' },
      pagination: { page: 2, limit: 10 },
    });

    expect(JSON.parse(params.get('filters')!)).toEqual([{ field: 'city', value: 'BERLIN' }]);
    expect(JSON.parse(params.get('sorting')!)).toEqual({ field: 'createdAt', direction: 'desc' });
    expect(JSON.parse(params.get('pagination')!)).toEqual({ page: 2, limit: 10 });
  });

  // The API validates `filters` with @IsNotEmpty, so "no filters" cannot be an
  // empty array — it has to be a filter that matches everything.
  it('substitutes a no-op filter when none are supplied', () => {
    expect(JSON.parse(buildListParams({}).get('filters')!)).toEqual([NO_OP_FILTER]);
    expect(JSON.parse(buildListParams({ filters: [] }).get('filters')!)).toEqual([NO_OP_FILTER]);
  });

  it('omits sorting when the caller does not ask for it', () => {
    expect(buildListParams({}).get('sorting')).toBeNull();
  });

  it('falls back to a default page size', () => {
    expect(JSON.parse(buildListParams({}).get('pagination')!)).toEqual({ page: 1, limit: 20 });
  });
});

describe('compactFilters', () => {
  it('drops untouched controls so they add no constraint', () => {
    expect(
      compactFilters([
        null,
        undefined,
        { field: 'city', value: '' },
        { field: 'type', value: [] },
        { field: 'age', value: {} },
        { field: 'status', value: 'APPROVED' },
      ]),
    ).toEqual([{ field: 'status', value: 'APPROVED' }]);
  });

  it('keeps a range with only one bound filled in', () => {
    expect(compactFilters([{ field: 'age', value: { from: '20' } }])).toEqual([
      { field: 'age', value: { from: '20' } },
    ]);
  });

  it('keeps an explicit false, which is a real filter value', () => {
    expect(compactFilters([{ field: 'isLookingForJob', value: false }])).toEqual([
      { field: 'isLookingForJob', value: false },
    ]);
  });
});

describe('toPaginated', () => {
  // Every list endpoint names its array after the resource; the shared list
  // components cannot know which key they are looking at.
  it('reads the array under the declared key', () => {
    const result = toPaginated<number>(
      { students: [1, 2], metadata: { ...EMPTY_META, totalItems: 2 } },
      'students',
    );

    expect(result.items).toEqual([1, 2]);
    expect(result.metadata.totalItems).toBe(2);
  });

  it('falls back to the first array when the key does not match', () => {
    expect(toPaginated<number>({ data: [3], metadata: EMPTY_META }, 'bookings').items).toEqual([3]);
  });

  it('returns an empty result for a malformed response instead of throwing', () => {
    expect(toPaginated<number>(null).items).toEqual([]);
    expect(toPaginated<number>({}).metadata).toEqual(EMPTY_META);
  });
});
