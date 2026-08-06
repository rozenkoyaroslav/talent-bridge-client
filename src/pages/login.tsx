import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { ApiError } from '@/shared/api/http';
import { Button, Card, Field, Input } from '@/shared/ui';
import { IS_MOCK_MODE } from '@/mocks/browser';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/mocks/db';
import { DemoBanner } from '@/app/demo-banner';

export const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (nextEmail: string, nextPassword: string) => {
    setError(null);
    setAwaitingApproval(false);
    setIsSubmitting(true);

    try {
      await login(nextEmail, nextPassword);
      navigate('/');
    } catch (caught) {
      // A pending account authenticates but is refused entry: that is a state to
      // explain, not a credentials error to shrug at.
      if (caught instanceof ApiError && caught.status === 403) setAwaitingApproval(true);
      else setError(caught instanceof ApiError ? caught.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight">
              Talent<span className="text-blue-600">Bridge</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Internships and jobs for students and graduates
            </p>
          </div>

          <Card className="p-6">
            <form
              className="space-y-4"
              onSubmit={event => {
                event.preventDefault();
                void submit(email, password);
              }}
            >
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                />
              </Field>

              <Field label="Password">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </Field>

              {awaitingApproval && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-medium">Your account is awaiting approval</p>
                  <p className="mt-1">
                    An administrator reviews every new account. You will be able to sign in as soon
                    as yours is approved.
                  </p>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-4 flex justify-between text-sm">
              <Link to="/register/student" className="text-blue-600 hover:underline">
                Create an account
              </Link>
              <Link to="/forgot-password" className="text-slate-500 hover:underline">
                Forgot password?
              </Link>
            </div>
          </Card>

          {IS_MOCK_MODE && (
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Explore the demo
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(['student', 'employer', 'admin'] as const).map(role => (
                  <Button
                    key={role}
                    variant="secondary"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => void submit(DEMO_ACCOUNTS[role], DEMO_PASSWORD)}
                  >
                    {role[0].toUpperCase() + role.slice(1)}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
