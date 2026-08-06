import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Role } from '@/entities/types';
import { AppLayout } from './layout';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { VacanciesPage } from '@/pages/vacancies';
import { MyVacanciesPage } from '@/pages/my-vacancies';
import { MyResponsesPage } from '@/pages/my-responses';
import { ReceivedResponsesPage } from '@/pages/received-responses';
import { CandidatesPage } from '@/pages/candidates';
import { CandidateDetailsPage } from '@/pages/candidate-details';
import { BookingsPage } from '@/pages/bookings';
import { PracticesPage } from '@/pages/practices';
import { StudentProfilePage } from '@/pages/student-profile';
import { ChatPage } from '@/pages/chat';
import { NotificationsPage } from '@/pages/notifications';
import { AdminUsersPage } from '@/pages/admin-users';
import { AdminStudentsPage } from '@/pages/admin-students';
import { AdminVacanciesPage } from '@/pages/admin-vacancies';
import { AdminBookingsPage } from '@/pages/admin-bookings';
import { AdminAnalyticsPage } from '@/pages/admin-analytics';

const HOME_BY_ROLE: Record<Role, string> = {
  [Role.STUDENT]: '/vacancies',
  [Role.EMPLOYER]: '/candidates',
  [Role.ADMIN]: '/admin/analytics',
};

const RequireAuth = ({ roles, children }: { roles?: Role[]; children: React.ReactNode }) => {
  const { user, isBootstrapping } = useAuth();

  // The session is restored asynchronously; routing before it settles would bounce
  // an authenticated user to the login screen on every reload.
  if (isBootstrapping) {
    return (
      <div className="flex h-full items-center justify-center p-16 text-sm text-slate-500">
        Restoring session…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  return <>{children}</>;
};

const HomeRedirect = () => {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
};

export const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register/:role" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />

    <Route
      element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }
    >
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:chatId" element={<ChatPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/bookings" element={<BookingsPage />} />
      <Route path="/practices" element={<PracticesPage />} />

      <Route
        path="/vacancies"
        element={
          <RequireAuth roles={[Role.STUDENT]}>
            <VacanciesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/my-responses"
        element={
          <RequireAuth roles={[Role.STUDENT]}>
            <MyResponsesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth roles={[Role.STUDENT]}>
            <StudentProfilePage />
          </RequireAuth>
        }
      />

      <Route
        path="/candidates"
        element={
          <RequireAuth roles={[Role.EMPLOYER]}>
            <CandidatesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/candidates/:userId"
        element={
          <RequireAuth roles={[Role.EMPLOYER, Role.ADMIN]}>
            <CandidateDetailsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/my-vacancies"
        element={
          <RequireAuth roles={[Role.EMPLOYER]}>
            <MyVacanciesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/responses"
        element={
          <RequireAuth roles={[Role.EMPLOYER]}>
            <ReceivedResponsesPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/users"
        element={
          <RequireAuth roles={[Role.ADMIN]}>
            <AdminUsersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/students"
        element={
          <RequireAuth roles={[Role.ADMIN]}>
            <AdminStudentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/vacancies"
        element={
          <RequireAuth roles={[Role.ADMIN]}>
            <AdminVacanciesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <RequireAuth roles={[Role.ADMIN]}>
            <AdminBookingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <RequireAuth roles={[Role.ADMIN]}>
            <AdminAnalyticsPage />
          </RequireAuth>
        }
      />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
