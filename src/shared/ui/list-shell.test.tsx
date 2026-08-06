import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListShell } from './list-shell';
import { EMPTY_META, type Paginated } from '@/shared/api/paginated';

/**
 * Every list screen delegates its four states to this component, so a regression
 * here shows up on nine screens at once. Rendering it also keeps the
 * @testing-library/dom peer dependency honest — it went missing once and only CI noticed.
 */
const listQuery = (overrides: Partial<Parameters<typeof ListShell<string>>[0]['query']> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

const paginated = (items: string[], page = 1, totalPages = 1): Paginated<string> => ({
  items,
  metadata: { ...EMPTY_META, page, totalPages, totalItems: items.length, hasNext: page < totalPages },
});

describe('ListShell', () => {
  it('shows placeholders while loading, not an empty state', () => {
    render(
      <ListShell query={listQuery({ isLoading: true })} onPageChange={vi.fn()} emptyTitle="Nothing">
        {items => <span>{items.join()}</span>}
      </ListShell>,
    );

    expect(screen.queryByText('Nothing')).not.toBeInTheDocument();
  });

  it('offers a retry that calls refetch when the request failed', async () => {
    const refetch = vi.fn();
    render(
      <ListShell
        query={listQuery({ isError: true, error: new Error('Network down'), refetch })}
        onPageChange={vi.fn()}
        emptyTitle="Nothing"
      >
        {items => <span>{items.join()}</span>}
      </ListShell>,
    );

    expect(screen.getByText('Network down')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('distinguishes an empty result from a failure', () => {
    render(
      <ListShell
        query={listQuery({ data: paginated([]) })}
        onPageChange={vi.fn()}
        emptyTitle="No candidates"
        emptyDescription="Try widening the filters."
      >
        {items => <span>{items.join()}</span>}
      </ListShell>,
    );

    expect(screen.getByText('No candidates')).toBeInTheDocument();
    expect(screen.getByText('Try widening the filters.')).toBeInTheDocument();
  });

  it('renders the items and hides paging for a single page', () => {
    render(
      <ListShell query={listQuery({ data: paginated(['Ann', 'Bo']) })} onPageChange={vi.fn()} emptyTitle="Nothing">
        {items => (
          <ul>
            {items.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </ListShell>,
    );

    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('pages forward and disables Previous on the first page', async () => {
    const onPageChange = vi.fn();
    render(
      <ListShell
        query={listQuery({ data: paginated(['Ann'], 1, 3) })}
        onPageChange={onPageChange}
        emptyTitle="Nothing"
      >
        {items => <span>{items.join()}</span>}
      </ListShell>,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
