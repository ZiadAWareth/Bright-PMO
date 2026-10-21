import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell, APP_NAME } from '@/components/auth/auth-shell';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  // Optional in the SCHEMA, required in the submit handler only when this app offers passwords: an
  // app configured for one-time codes only has no password box to fill in, and a resolver that
  // demanded one would make its sign-in button permanently dead.
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login, signInWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // How this app signs people in. Read from the app itself rather than baked in at generation time:
  // an administrator changes it on the Sign-in and email page while the app is running.
  //
  // Until it answers, the password box is shown. That is the right default for the wait: it is what
  // every app offers unless told otherwise, so the common case never flickers.
  const [methods, setMethods] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/auth/methods')
      .then((res: { data?: { methods?: string[]; passwordReset?: boolean } }) => {
        if (cancelled) return;
        setMethods((res.data?.methods as string[]) ?? ['password']);
      })
      .catch(() => {
        if (!cancelled) setMethods(['password']);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const passwordOffered = methods === null || methods.includes('password');
  const otpOffered = methods !== null && methods.includes('otp');

  // The code flow, which is deliberately a separate little state machine rather than a second form:
  // it is the same email box, then a code box.
  const [codeSentTo, setCodeSentTo] = useState('');
  const [codeNotice, setCodeNotice] = useState('');
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  const requestCode = async () => {
    setServerError('');
    const email = String(getValues('email') ?? '').trim();
    if (!email) {
      setServerError('Enter your email address first.');
      return;
    }
    setCodeBusy(true);
    try {
      const res = await api.post('/api/auth/request-code', { email });
      setCodeSentTo(email);
      // The server's own sentence, which is identical for an address that has an account and one
      // that does not. Not reworded here: rewording it is how a front end accidentally turns a
      // deliberately uniform answer into two different ones.
      setCodeNotice(String(res.data?.message ?? 'Check your email for a sign-in code.'));
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Could not send a code.');
    } finally {
      setCodeBusy(false);
    }
  };

  const submitCode = async () => {
    setServerError('');
    setCodeBusy(true);
    try {
      const { data } = await api.post('/api/auth/verify-code', { email: codeSentTo, code });
      signInWithToken(data.accessToken ?? data.token ?? data.access_token);
      const to = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (e) {
      const res = (e as { response?: { data?: { message?: string | string[] } } }).response;
      const message = res?.data?.message;
      setServerError(
        (Array.isArray(message) ? message.join(', ') : message) || (e instanceof Error ? e.message : 'That code did not work.'),
      );
    } finally {
      setCodeBusy(false);
    }
  };

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    // Codes only: the one thing the button can do is ask for one.
    if (!passwordOffered) {
      await requestCode();
      return;
    }
    if (!values.password) {
      setServerError('Password is required');
      return;
    }
    try {
      await login(values.email, values.password);
      const to = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <AuthShell
      title="Sign in"
      description={'Enter your credentials to access ' + APP_NAME + '.'}
      footer={
        <>
          <Users className="h-3.5 w-3.5" />
          Need access? Contact your administrator.
        </>
      }
    >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={cn('pl-9', errors.email && 'border-destructive focus-visible:ring-destructive')}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                {passwordOffered && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password">Password</Label>
                    {/* Always offered, like any sign-in page. Whether a reset email can actually be sent
                        is the forgot-password page's to say: it explains when this app's email is
                        not set up yet, instead of the link silently vanishing. */}
                    <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={cn('pl-9 pr-10', errors.password && 'border-destructive focus-visible:ring-destructive')}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                )}

                {serverError && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full bg-gradient-to-r from-brand to-brand-2 text-brand-foreground hover:opacity-90"
                >
                  {(isSubmitting || (!passwordOffered && codeBusy)) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {passwordOffered
                    ? isSubmitting
                      ? 'Signing in…'
                      : 'Sign in'
                    : codeBusy
                      ? 'Sending a code…'
                      : 'Email me a sign-in code'}
                </Button>

                {/* The code path. Offered as a second way in when the app allows both, and it IS the
                    way in when the app allows codes only. */}
                {otpOffered && passwordOffered && !codeSentTo && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={codeBusy}
                    onClick={requestCode}
                  >
                    {codeBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Email me a sign-in code instead
                  </Button>
                )}

                {otpOffered && codeSentTo && (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">{codeNotice}</p>
                    <div className="space-y-2">
                      <Label htmlFor="code">Sign-in code</Label>
                      <Input
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" className="h-10 flex-1" disabled={codeBusy || !code} onClick={submitCode}>
                        {codeBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                        Sign in with the code
                      </Button>
                      <Button type="button" variant="ghost" className="h-10" disabled={codeBusy} onClick={requestCode}>
                        Send another
                      </Button>
                    </div>
                  </div>
                )}
              </form>
    </AuthShell>
  );
}
