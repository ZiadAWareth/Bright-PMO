import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, Loader2, Mail, MailCheck, MailX, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell, APP_NAME } from '@/components/auth/auth-shell';

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

export default function ForgotPassword() {
  // null while asking whether reset works at all on this app right now.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/auth/methods')
      .then((res: { data?: { passwordReset?: boolean } }) => {
        if (!cancelled) setAvailable(Boolean(res.data?.passwordReset));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem('');
    setBusy(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: email.trim() });
      setSentMessage(String(res.data?.message ?? 'If an account exists for that address, we have sent it a reset link.'));
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const backToSignIn = (
    <Button asChild variant="outline" className="h-11 w-full">
      <Link to="/login">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </Button>
  );

  return (
    <AuthShell
      // Three honest states: reset works (the form), reset cannot work yet (this app has no email
      // set up — said plainly, not as a form that fails), and the email was sent.
      icon={
        sentMessage ? <MailCheck className="h-5 w-5" /> : available === false ? <MailX className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />
      }
      title={sentMessage ? 'Check your email' : available === false ? "Password reset isn't set up yet" : 'Forgot your password?'}
      description={
        sentMessage
          ? 'Follow the link in the email to choose a new password.'
          : available === false
            ? "This app can't send emails yet, so it can't send you a reset link right now."
            : 'Enter the email address you sign in with, and we will send you a link to choose a new password.'
      }
      headline={
        <>
          Get back into <span className="text-white">{APP_NAME}</span>.
        </>
      }
      tagline="A secure, single-use link is all it takes to choose a new password."
      footer={
        <>
          <Users className="h-3.5 w-3.5" />
          Need access? Contact your administrator.
        </>
      }
    >
      {available === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> One moment…
        </div>
      ) : !available ? (
        <div className="space-y-5">
          <div role="status" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="flex items-start gap-2 font-medium">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              What you can do
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Ask your administrator to reset your password for you.</li>
              <li>Or ask them to set up email under Settings → Sign-in &amp; Email — this page then works on its own.</li>
            </ul>
          </div>
          {backToSignIn}
        </div>
      ) : sentMessage ? (
        <div className="space-y-5">
          <div className="space-y-2 rounded-md border bg-muted/40 px-3 py-3 text-sm">
            <p>{sentMessage}</p>
            <p className="text-muted-foreground">
              Nothing after a few minutes? Check your spam folder, or ask again in a little while.
            </p>
          </div>
          {backToSignIn}
          <button
            type="button"
            onClick={() => setSentMessage('')}
            className="w-full text-center text-xs font-medium text-primary hover:underline"
          >
            Use a different email address
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
                required
              />
            </div>
          </div>

          {problem && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{problem}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || !email.trim()}
            className="h-11 w-full bg-gradient-to-r from-brand to-brand-2 text-brand-foreground hover:opacity-90"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
