import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { useSpecializations } from '@/features/candidates/api';
import { api, API_PREFIX, API_URL, ApiError } from '@/shared/api/http';
import { Button, Card, Field, Input, Select } from '@/shared/ui';
import { StudentStatus, City, type AuthResponse } from '@/entities/types';
import { humanize } from '@/shared/lib/format';
import { DemoBanner } from '@/app/demo-banner';

export const RegisterPage = () => {
  const { role } = useParams<{ role: string }>();
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const specializations = useSpecializations();

  const [form, setForm] = useState<Record<string, string>>({ status: StudentStatus.STUDENT });
  const [logo, setLogo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;
  if (role !== 'student' && role !== 'employer') return <Navigate to="/register/student" replace />;

  const isEmployer = role === 'employer';
  const set = (key: string) => (event: { target: { value: string } }) =>
    setForm(current => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let response: AuthResponse;

      if (isEmployer) {
        // The employer endpoint is multipart because the company logo is required.
        if (!logo) throw new Error('A company logo is required');

        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => body.append(key, value));
        body.append('file', logo);

        const raw = await fetch(`${API_URL}${API_PREFIX}/auth/register/employer`, {
          method: 'POST',
          credentials: 'include',
          body,
        });

        const parsed = await raw.json();
        if (!raw.ok) throw new ApiError(raw.status, parsed?.message ?? 'Registration failed');
        response = parsed as AuthResponse;
      } else {
        response = await api.post<AuthResponse>('/auth/register/student', form);
      }

      setSession(response);
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-4">
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight">
              Talent<span className="text-blue-600">Bridge</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create {isEmployer ? 'an employer' : 'a student'} account
            </p>
          </div>

          <Card className="p-6">
            <div className="mb-5 flex gap-2">
              {(['student', 'employer'] as const).map(option => (
                <Link key={option} to={`/register/${option}`} className="flex-1">
                  <Button
                    type="button"
                    variant={option === role ? 'primary' : 'secondary'}
                    className="w-full"
                  >
                    {humanize(option)}
                  </Button>
                </Link>
              ))}
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <Input required value={form.firstName ?? ''} onChange={set('firstName')} />
                </Field>
                <Field label="Last name">
                  <Input required value={form.lastName ?? ''} onChange={set('lastName')} />
                </Field>
              </div>

              <Field label="Email">
                <Input type="email" required value={form.email ?? ''} onChange={set('email')} />
              </Field>

              <Field label="Password" hint="At least 8 characters">
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={form.password ?? ''}
                  onChange={set('password')}
                />
              </Field>

              {isEmployer ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company">
                      <Input required value={form.companyName ?? ''} onChange={set('companyName')} />
                    </Field>
                    <Field label="City">
                      <Select required value={form.city ?? ''} onChange={set('city')}>
                        <option value="">Select…</option>
                        {Object.values(City).map(city => (
                          <option key={city} value={city}>
                            {humanize(city)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Position">
                      <Input value={form.workPosition ?? ''} onChange={set('workPosition')} />
                    </Field>
                    <Field label="Phone">
                      <Input value={form.phoneNumber ?? ''} onChange={set('phoneNumber')} />
                    </Field>
                  </div>

                  <Field label="Company logo" hint="PNG or JPG, required by the API">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg"
                      required
                      onChange={event => setLogo(event.target.files?.[0] ?? null)}
                    />
                  </Field>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Specialization">
                    <Select
                      required
                      value={form.specializationId ?? ''}
                      onChange={set('specializationId')}
                    >
                      <option value="">Select…</option>
                      {specializations.data?.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Status">
                    <Select value={form.status} onChange={set('status')}>
                      {Object.values(StudentStatus).map(status => (
                        <option key={status} value={status}>
                          {humanize(status)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                New accounts start as <strong>pending</strong>. An administrator reviews them before
                sign-in is possible.
              </p>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create account'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
