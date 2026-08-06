import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/http';
import { Button, Card, Field, Input } from '@/shared/ui';
import { DemoBanner } from '@/app/demo-banner';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      // The API answers identically whether or not the address exists, so the UI
      // must not leak the difference either — including on failure.
      setSent(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-6">
          <h1 className="text-lg font-semibold text-slate-900">Reset your password</h1>

          {sent ? (
            <div className="mt-4 space-y-4">
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                If this email exists, a password reset link has been sent.
              </p>
              <Link to="/login">
                <Button variant="secondary" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={submit}>
              <Field label="Email">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </Field>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>

              <Link to="/login" className="block text-center text-sm text-slate-500 hover:underline">
                Back to sign in
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
