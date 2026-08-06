import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { initials } from '@/shared/lib/format';
import type { Status } from '@/entities/types';

/**
 * Small hand-rolled primitives rather than a component library: the set needed here
 * is narrow, and every one of them is a single element with a class string.
 */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
} as const;

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
      'disabled:cursor-not-allowed disabled:opacity-70',
      size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
      BUTTON_VARIANTS[variant],
      className,
    )}
    {...props}
  />
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
      'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100',
      className,
    )}
    {...props}
  />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
      'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100',
      className,
    )}
    {...props}
  />
);

export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
      'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100',
      className,
    )}
    {...props}
  >
    {children}
  </select>
);

export const Field = ({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && !error && <span className="block text-xs text-slate-500">{hint}</span>}
    {error && <span className="block text-xs text-red-600">{error}</span>}
  </label>
);

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('rounded-xl border border-slate-200 bg-white', className)}>{children}</div>
);

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
  COMPLETED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
};

export const StatusBadge = ({ status }: { status: Status | string | null | undefined }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      STATUS_STYLES[status ?? ''] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20',
    )}
  >
    {status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown'}
  </span>
);

export const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600',
      className,
    )}
  >
    {children}
  </span>
);

export const Avatar = ({
  src,
  firstName,
  lastName,
  size = 40,
}: {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number;
}) =>
  src ? (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-slate-100 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-medium text-slate-600"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {initials(firstName, lastName)}
    </span>
  );

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />
);

export const EmptyState = ({ title, description }: { title: string; description?: string }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
    <p className="font-medium text-slate-700">{title}</p>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
    <p className="text-sm font-medium text-red-800">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const Pagination = ({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-4 py-3">
    <p className="text-sm text-slate-500">
      {totalItems === 0 ? 'No results' : `${totalItems} result${totalItems === 1 ? '' : 's'}`}
      {totalPages > 1 && ` · page ${page} of ${totalPages}`}
    </p>
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  </div>
);

export const Modal = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
