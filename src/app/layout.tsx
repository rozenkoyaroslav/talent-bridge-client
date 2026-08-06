import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { useUnreadCount } from '@/features/notifications/api';
import { Avatar, Badge, Button } from '@/shared/ui';
import { Role } from '@/entities/types';
import { cn } from '@/shared/lib/cn';
import { DemoBanner } from './demo-banner';

const NAV_BY_ROLE: Record<Role, { to: string; label: string }[]> = {
  [Role.STUDENT]: [
    { to: '/vacancies', label: 'Vacancies' },
    { to: '/my-responses', label: 'My responses' },
    { to: '/bookings', label: 'Bookings' },
    { to: '/practices', label: 'Practices' },
    { to: '/profile', label: 'Profile' },
  ],
  [Role.EMPLOYER]: [
    { to: '/candidates', label: 'Candidates' },
    { to: '/my-vacancies', label: 'My vacancies' },
    { to: '/responses', label: 'Responses' },
    { to: '/bookings', label: 'Bookings' },
    { to: '/practices', label: 'Practices' },
  ],
  [Role.ADMIN]: [
    { to: '/admin/analytics', label: 'Analytics' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/students', label: 'Profiles' },
    { to: '/admin/vacancies', label: 'Vacancies' },
    { to: '/admin/bookings', label: 'Bookings' },
  ],
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
  );

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount(Boolean(user));

  if (!user) return null;

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <NavLink to="/" className="text-base font-semibold tracking-tight text-slate-900">
            Talent<span className="text-blue-600">Bridge</span>
          </NavLink>

          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV_BY_ROLE[user.role].map(item => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NavLink to="/chat" className={navClass}>
              Chat
            </NavLink>
            <NavLink to="/notifications" className={navClass}>
              <span className="flex items-center gap-1.5">
                Alerts
                {(unread?.total ?? 0) > 0 && (
                  <Badge className="bg-blue-600 text-white">{unread!.total}</Badge>
                )}
              </span>
            </NavLink>

            <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
              <Avatar
                src={user.profileImage}
                firstName={user.firstName}
                lastName={user.lastName}
                size={32}
              />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-slate-800">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-500">{user.role.toLowerCase()}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
