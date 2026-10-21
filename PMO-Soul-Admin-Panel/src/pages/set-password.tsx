import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell, APP_NAME } from '@/components/auth/auth-shell';
import { cn } from '@/lib/utils';

/** Mirrors what AuthService.checkSetupToken returns. */
interface TokenCheck {
  valid: boolean;
  state: 'valid' | 'used' | 'expired' | 'unknown';
  message: string;
  email: string | null;
  /** 'invite' — finishing a new account; 'reset' — the owner asked for a new password. */
  purpose?: 'invite' | 'reset';
}

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/** A password box exactly like sign-in's: lock icon on the left, show/hide on the right. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('pl-9 pr-10', invalid && 'border-destructive focus-visible:ring-destructive')}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function SetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [check, setCheck] = useState<TokenCheck | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(false);

  // Asked BEFORE the form is offered, so a dead link says so instead of failing on submit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setCheck({ valid: false, state: 'unknown', message: 'This link is missing its token.', email: null });
        return;
      }
      try {
        const res = await api.get('/api/auth/setup-password', { params: { token } });
        if (!cancelled) setCheck(res.data as TokenCheck);
      } catch (err) {
        if (!cancelled) {
          setCheck({ valid: false, state: 'unknown', message: errorMessage(err), email: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const reset = check?.purpose === 'reset';
  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProblem('');
    // Checked here as well as on the server: the two boxes exist to catch a typo, and a round trip
    // to be told "they do not match" is a round trip that teaches nothing.
    if (password !== confirm) {
      setProblem('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/setup-password', { token, password });
      setDone(true);
      // Straight to sign-in, which also proves the password just chosen works. No session is handed
      // out here: setting a password is not signing in.
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const invalid = check !== null && !check.valid && !done;

  return (
    <AuthShell
      icon={
        done ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : invalid ? (
          <ShieldAlert className="h-5 w-5" />
        ) : (
          <KeyRound className="h-5 w-5" />
        )
      }
      title={
        done
          ? reset
            ? 'Password changed'
            : 'Password set'
          : invalid
            ? 'This link cannot be used'
            : reset
              ? 'Choose a new password'
              : 'Choose your password'
      }
      description={
        check?.email
          ? 'For ' + check.email
          : reset
            ? 'Reset the password for your account.'
            : 'Finish setting up your account.'
      }
      headline={
        reset ? (
          <>
            Secure your <span className="text-white">{APP_NAME}</span> account.
          </>
        ) : (
          <>
            Welcome to <span className="text-white">{APP_NAME}</span>.
          </>
        )
      }
      tagline={
        reset
          ? 'Choose a new password. Every other device is signed out once it is changed.'
          : 'Choose a password to finish setting up your account and get started.'
      }
    >
      {!check ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
        </div>
      ) : done ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {reset
              ? 'Your password has been changed, and every other session was signed out. Taking you to the sign-in page…'
              : 'Your password is set. Taking you to the sign-in page…'}
          </span>
        </div>
      ) : !check.valid ? (
        <div className="space-y-5">
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{check.message}</span>
          </div>
          {reset && check.state !== 'used' && (
            <Button asChild className="h-11 w-full bg-gradient-to-r from-brand to-brand-2 text-brand-foreground hover:opacity-90">
              <Link to="/forgot-password">Ask for a new link</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} />
          <div className="space-y-2">
            <PasswordField id="confirm-password" label="Repeat it" value={confirm} onChange={setConfirm} invalid={mismatch} />
            {mismatch ? (
              <p className="text-sm text-destructive">The two passwords do not match.</p>
            ) : (
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            )}
          </div>

          {problem && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{problem}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || password.length < 8 || password !== confirm}
            className="h-11 w-full bg-gradient-to-r from-brand to-brand-2 text-brand-foreground hover:opacity-90"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {reset ? 'Change my password' : 'Set my password'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {reset
              ? 'This link works once. Changing your password signs you out on every other device.'
              : 'This link works once. Nobody else, including the administrator who invited you, ever sees what you choose.'}
          </p>
        </form>
      )}
    </AuthShell>
  );
}
