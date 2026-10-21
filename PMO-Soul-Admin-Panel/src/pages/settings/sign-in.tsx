import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Send,
  Server,
  ShieldCheck,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/** Mirrors AuthSettingsView in src/auth/auth-settings.service.ts. */
interface AuthSettingsView {
  methods: string[];
  signUp?: { enabled: boolean; role: string | null; organizationId: number | null };
  updatedAt: string | null;
  updatedByEmail: string | null;
}

/** Mirrors MailSettingsView in src/mail/mail.service.ts. */
interface MailSettingsView {
  configured: boolean;
  host: string;
  port: number | null;
  secure: boolean;
  username: string;
  fromAddress: string;
  fromName: string;
  hasPassword: boolean;
  passwordHint: string;
  source: 'node' | 'settings' | 'environment' | 'none';
  updatedAt: string | null;
  updatedByEmail: string | null;
}

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/** The three states the picker offers. Anything else the server would refuse by name. */
const METHOD_CHOICES: Array<{ id: string; methods: string[]; label: string; help: string; icon: LucideIcon }> = [
  {
    id: 'password',
    icon: KeyRound,
    methods: ['password'],
    label: 'Password',
    help: 'People sign in with an email address and a password they chose from an invitation.',
  },
  {
    id: 'otp',
    icon: MailCheck,
    methods: ['otp'],
    label: 'One-time code by email',
    help: 'No passwords at all. Each sign-in sends a six-digit code that expires in ten minutes.',
  },
  {
    id: 'both',
    icon: ShieldCheck,
    methods: ['password', 'otp'],
    label: 'Either one',
    help: 'People choose: a password, or a code emailed to them.',
  },
];

/**
 * Well-known providers' SERVER settings, to save looking them up. Only host, port, TLS and (where
 * the provider fixes it) the username; the password and sender are always the admin's own.
 */
const SMTP_PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false, username: '' },
  { name: 'Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false, username: '' },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false, username: 'apikey' },
  // 2465, not 465: hosts such as DigitalOcean block the standard SMTP ports, and Resend also
  // listens on 2465 (TLS) / 2587 (STARTTLS), so this works wherever the app is deployed.
  { name: 'Resend', host: 'smtp.resend.com', port: 2465, secure: true, username: 'resend' },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false, username: '' },
] as const;

function choiceOf(methods: string[] | undefined): string {
  const set = new Set(methods ?? []);
  if (set.has('password') && set.has('otp')) return 'both';
  if (set.has('otp')) return 'otp';
  return 'password';
}

export default function SignInSettings() {
  const queryClient = useQueryClient();

  const auth = useQuery<AuthSettingsView>({
    queryKey: ['auth', 'settings'],
    queryFn: async () => (await api.get('/api/auth/settings')).data,
    retry: false,
  });
  const mail = useQuery<MailSettingsView>({
    queryKey: ['mail', 'settings'],
    queryFn: async () => (await api.get('/api/mail/settings')).data,
    retry: false,
  });

  const { user } = useAuth();
  const roles = useQuery<string[]>({
    queryKey: ['roles', 'names'],
    queryFn: async () => {
      const data = (await api.get('/api/rolesandpermissions', { params: { limit: 200 } })).data;
      return ((data?.data ?? data ?? []) as Array<{ role?: string }>).map((r) => String(r.role ?? '')).filter(Boolean);
    },
    retry: false,
  });

  const [choice, setChoice] = useState('password');
  const [signUpOn, setSignUpOn] = useState(false);
  const [signUpRole, setSignUpRole] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('');
  const [testTo, setTestTo] = useState('');
  // The provider preset in force. Its fields are LOCKED to the provider's values: a hand-edited
  // port on a preset is exactly the mistake the preset exists to prevent. "Use custom settings"
  // unlocks them.
  const [presetName, setPresetName] = useState<string | null>(null);

  // Seeded from the server, like the AI Provider page: the form must show what is actually stored,
  // including settings that came from environment variables.
  useEffect(() => {
    if (!auth.data) return;
    setChoice(choiceOf(auth.data.methods));
    setSignUpOn(Boolean(auth.data.signUp?.enabled));
    setSignUpRole(auth.data.signUp?.role ?? '');
  }, [auth.data]);
  // Nothing chosen yet: offer Member, the role the seed creates for exactly this, with no permissions.
  useEffect(() => {
    if (!signUpRole && roles.data?.includes('Member')) setSignUpRole('Member');
  }, [roles.data, signUpRole]);
  useEffect(() => {
    if (!mail.data) return;
    setHost(mail.data.host || '');
    setPort(mail.data.port ? String(mail.data.port) : '');
    setSecure(Boolean(mail.data.secure));
    setUsername(mail.data.username || '');
    setFromAddress(mail.data.fromAddress || '');
    setFromName(mail.data.fromName || '');
    // Saved settings that ARE a preset reopen locked, so the page says what they are.
    const match = SMTP_PRESETS.find((p) =>
      p.host === mail.data.host && p.port === mail.data.port && p.secure === Boolean(mail.data.secure) &&
      (!p.username || p.username === mail.data.username));
    setPresetName(match ? match.name : null);
  }, [mail.data]);

  const saveMethods = useMutation({
    mutationFn: async (methods: string[]) => (await api.put('/api/auth/settings', { methods })).data,
    onSuccess: () => {
      toast.success('Saved how people sign in.');
      queryClient.invalidateQueries({ queryKey: ['auth', 'settings'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const saveSignUp = useMutation({
    mutationFn: async () => {
      // New accounts join the organisation of the administrator who turns sign-up on. A platform
      // administrator (organisation 0) belongs to none, so nothing is sent and the app default holds.
      const org = Number(user?.organizationId);
      return (
        await api.put('/api/auth/settings/sign-up', {
          enabled: signUpOn,
          role: signUpRole || null,
          organizationId: Number.isInteger(org) && org > 0 ? org : null,
        })
      ).data;
    },
    onSuccess: () => {
      toast.success(signUpOn ? 'Public sign-up is on.' : 'Public sign-up is off.');
      queryClient.invalidateQueries({ queryKey: ['auth', 'settings'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const signUpSaved = auth.data?.signUp;
  const signUpDirty = signUpOn !== Boolean(signUpSaved?.enabled) || (signUpRole || '') !== (signUpSaved?.role ?? '');

  const saveMail = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        host,
        port: port ? Number(port) : null,
        secure,
        username,
        fromAddress,
        fromName,
      };
      // Sent ONLY when the admin typed something, so an untouched field keeps the stored password
      // instead of clearing it. An explicit empty string is how it is deleted — see the
      // three-state rule in MailService.save.
      if (password) body.password = password;
      return (await api.put('/api/mail/settings', body)).data;
    },
    onSuccess: () => {
      setPassword('');
      toast.success('Saved the email settings.');
      queryClient.invalidateQueries({ queryKey: ['mail', 'settings'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const clearPassword = useMutation({
    mutationFn: async () => (await api.put('/api/mail/settings', { password: '' })).data,
    onSuccess: () => {
      toast.success('Removed the saved SMTP password.');
      queryClient.invalidateQueries({ queryKey: ['mail', 'settings'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const sendTest = useMutation({
    mutationFn: async () => (await api.post('/api/mail/test', { to: testTo || undefined })).data,
    onSuccess: (data: { to?: string }) => toast.success('Test message sent to ' + (data?.to ?? 'you') + '.'),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const otpChosen = choice !== 'password';
  const busy = saveMail.isPending || sendTest.isPending || clearPassword.isPending;
  const mailReady = Boolean(mail.data?.configured);

  // The open tab lives in the address (?tab=email), so a link can open the email settings directly.
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'email' ? 'email' : 'method';
  const openTab = (next: string) => {
    const copy = new URLSearchParams(params);
    if (next === 'email') copy.set('tab', 'email');
    else copy.delete('tab');
    setParams(copy, { replace: true });
  };

  /** Fills the server part for a well-known provider; the account and sender stay the admin's. */
  const applyPreset = (preset: (typeof SMTP_PRESETS)[number]) => {
    setHost(preset.host);
    setPort(String(preset.port));
    setSecure(preset.secure);
    if (preset.username) setUsername(preset.username);
    setPresetName(preset.name);
  };
  const preset = SMTP_PRESETS.find((p) => p.name === presetName) ?? null;
  const serverLocked = Boolean(preset);
  const usernameLocked = Boolean(preset?.username);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign-in and email</h1>
        <p className="text-sm text-muted-foreground">
          How people get into this app, and how it sends the invitations and codes that let them.
        </p>
      </div>

      <Tabs value={tab} onValueChange={openTab} className="space-y-6">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl p-1 sm:w-auto">
          <TabsTrigger value="method" className="gap-2 rounded-lg px-4 py-2">
            <KeyRound className="h-4 w-4" /> Sign-in method
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 rounded-lg px-4 py-2">
            <Mail className="h-4 w-4" /> Email delivery
            <span
              aria-label={mailReady ? 'Email is set up' : 'Email is not set up'}
              title={mailReady ? 'Email is set up' : 'Email is not set up'}
              className={'h-2 w-2 rounded-full ' + (mailReady ? 'bg-emerald-500' : 'bg-amber-500')}
            />
          </TabsTrigger>
        </TabsList>

        {/* ── How people sign in ── */}
        <TabsContent value="method" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How people sign in</CardTitle>
              <CardDescription>
                A sign-in screen built with the UI Builder reads this from the app contract, so the
                password field disappears on its own when you choose codes only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div role="radiogroup" aria-label="Sign-in method" className="grid gap-3 md:grid-cols-3">
                {METHOD_CHOICES.map((option) => {
                  const Icon = option.icon;
                  const selected = choice === option.id;
                  return (
                    <label
                      key={option.id}
                      className={
                        'relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring ' +
                        (selected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40 hover:bg-muted/40')
                      }
                    >
                      <input
                        type="radio"
                        name="auth-method"
                        className="sr-only"
                        value={option.id}
                        checked={selected}
                        onChange={() => setChoice(option.id)}
                      />
                      <span className="flex items-center justify-between">
                        <span className={'grid h-9 w-9 place-items-center rounded-lg ' + (selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span
                          aria-hidden="true"
                          className={'grid h-5 w-5 place-items-center rounded-full border ' + (selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                      </span>
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className="text-sm text-muted-foreground">{option.help}</span>
                    </label>
                  );
                })}
              </div>

              {/* Password reset is ALWAYS ON; whether it can work is a fact this row states. */}
              {choice !== 'otp' && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                  <span className={'h-2 w-2 shrink-0 rounded-full ' + (mailReady ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">Password reset: {mailReady ? 'active' : 'inactive'}</span>
                    <span className="block text-muted-foreground">
                      {mailReady
                        ? 'People can reset a forgotten password from the sign-in page. The link is emailed, works once and expires in 30 minutes.'
                        : 'People cannot reset a forgotten password until this app can send email, so the sign-in page hides the link.'}
                    </span>
                  </span>
                  {!mailReady && (
                    <Button size="sm" variant="outline" onClick={() => openTab('email')}>
                      Set up email
                    </Button>
                  )}
                </div>
              )}

              {otpChosen && !mailReady && (
                <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    One-time codes are emailed, and this app cannot send email yet. Set up email
                    delivery first, or nobody will be able to sign in.
                  </span>
                  <Button size="sm" variant="outline" onClick={() => openTab('email')}>
                    Set up email
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button
                  onClick={() => {
                    const picked = METHOD_CHOICES.find((o) => o.id === choice);
                    if (picked) saveMethods.mutate(picked.methods);
                  }}
                  disabled={saveMethods.isPending}
                >
                  {saveMethods.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save sign-in method
                </Button>
                {auth.data?.updatedAt && (
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(auth.data.updatedAt).toLocaleString()}
                    {auth.data.updatedByEmail ? ' by ' + auth.data.updatedByEmail : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Public sign-up: the switch, and the one question it needs answered ── */}
          <Card className="mt-6">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Public sign-up
                </CardTitle>
                <CardDescription>
                  Let people create their own account from a page you build in Customer Pages (a button
                  whose action is “Sign up (create account)”). The account is ready straight away.
                </CardDescription>
              </div>
              <Badge variant={signUpSaved?.enabled ? 'default' : 'outline'} className="shrink-0">
                {signUpSaved?.enabled ? 'On' : 'Off'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Switch id="sign-up-on" checked={signUpOn} onCheckedChange={setSignUpOn} className="mt-0.5" />
                <Label htmlFor="sign-up-on" className="font-normal leading-snug">
                  <span className="block font-medium">Let people sign up</span>
                  <span className="block text-muted-foreground">
                    {signUpOn
                      ? 'Anyone who reaches your sign-up page can create an account.'
                      : 'Only administrators create accounts, from the Users page.'}
                  </span>
                </Label>
              </div>

              {signUpOn && (
                <div className="space-y-2">
                  <Label htmlFor="sign-up-role">Role new accounts get</Label>
                  <Select value={signUpRole} onValueChange={setSignUpRole}>
                    <SelectTrigger id="sign-up-role" className="max-w-xs">
                      <SelectValue placeholder={roles.isLoading ? 'Loading roles…' : 'Choose a role'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(roles.data ?? []).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The person signing up never chooses this. A role that can administer the app is refused.
                    {user?.organizationId ? ' New accounts join your organisation.' : ''}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                To do something when an account is created (a welcome email, a notification), build a
                workflow that starts on the User table’s “created” event.
              </p>

              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button onClick={() => saveSignUp.mutate()} disabled={saveSignUp.isPending || !signUpDirty || (signUpOn && !signUpRole)}>
                  {saveSignUp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save sign-up
                </Button>
                {signUpOn && !signUpRole && (
                  <span className="text-xs text-muted-foreground">Choose a role to turn sign-up on.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── How the app sends email ── */}
        <TabsContent value="email" className="mt-0 space-y-6">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Email delivery (SMTP)</CardTitle>
                <CardDescription>
                  Used by invitations, sign-in codes, and every workflow that sends email without its
                  own connection. The password is encrypted before it is stored and is never sent back
                  to this page.
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {mailReady ? (
                  <Badge className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Can send mail
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Not configured
                  </Badge>
                )}
                {mail.data?.source === 'environment' && <Badge variant="outline">From environment variables</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Quick fill:</span>
                {SMTP_PRESETS.map((option) => (
                  <Button
                    key={option.name}
                    type="button"
                    size="sm"
                    variant={presetName === option.name ? 'default' : 'outline'}
                    aria-pressed={presetName === option.name}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => applyPreset(option)}
                  >
                    {option.name}
                  </Button>
                ))}
                {preset && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setPresetName(null)}
                  >
                    Use custom settings
                  </button>
                )}
              </div>

              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold">
                  <Server className="h-4 w-4 text-muted-foreground" /> Server
                </legend>
                {preset && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Set for {preset.name}. Choose “Use custom settings” to change them.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP host</Label>
                    <Input id="smtp-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" readOnly={serverLocked} className={serverLocked ? 'bg-muted/60 text-muted-foreground' : undefined} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input id="smtp-port" inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" readOnly={serverLocked} className={serverLocked ? 'bg-muted/60 text-muted-foreground' : undefined} />
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Switch id="smtp-secure" checked={secure} onCheckedChange={setSecure} disabled={serverLocked} className="mt-0.5" />
                  <Label htmlFor="smtp-secure" className="font-normal leading-snug">
                    <span className="block font-medium">Use TLS from the start</span>
                    <span className="block text-muted-foreground">On for port 465. Off for 587, which upgrades with STARTTLS.</span>
                  </Label>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold">
                  <UserRound className="h-4 w-4 text-muted-foreground" /> Account
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">Username</Label>
                    <Input id="smtp-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" readOnly={usernameLocked} className={usernameLocked ? 'bg-muted/60 text-muted-foreground' : undefined} />
                    {usernameLocked && preset && (
                      <p className="text-xs text-muted-foreground">{preset.name} always uses this username.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-pass">Password</Label>
                    <Input
                      id="smtp-pass"
                      type="password"
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mail.data?.hasPassword ? 'Leave blank to keep the saved password' : 'SMTP password or API key'}
                    />
                    {mail.data?.hasPassword && (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">Saved: ••••{mail.data.passwordHint}</span>
                        <button
                          type="button"
                          className="font-medium text-destructive hover:underline disabled:opacity-50"
                          onClick={() => clearPassword.mutate()}
                          disabled={busy}
                        >
                          Remove
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-semibold">
                  <Send className="h-4 w-4 text-muted-foreground" /> Sender
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from">From address</Label>
                    <Input id="smtp-from" type="email" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="no-reply@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from-name">From name</Label>
                    <Input id="smtp-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Acme" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Most providers only send from an address on a domain you have verified with them.
                </p>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button onClick={() => saveMail.mutate()} disabled={busy}>
                  {saveMail.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save email settings
                </Button>
                {mail.data?.updatedAt && (
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(mail.data.updatedAt).toLocaleString()}
                    {mail.data.updatedByEmail ? ' by ' + mail.data.updatedByEmail : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send a test message</CardTitle>
              <CardDescription>
                Sent through exactly the same code an invitation uses, so a message that arrives proves
                invitations will too. Save the settings first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="smtp-test"
                  type="email"
                  aria-label="Send the test message to"
                  className="max-w-xs"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="your own address"
                />
                <Button variant="secondary" onClick={() => sendTest.mutate()} disabled={busy}>
                  {sendTest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
