import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MailCheck,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors AuthService.profileView. */
interface Profile {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleName: string | null;
  organizationId: number | null;
  isPlatformAdmin: boolean;
  createdAt: string | null;
  hasPassword: boolean;
  passwordSignIn: boolean;
  editableFields: string[];
}

/** The server's floor, restated for the hint only — the server decides (src/auth/registration.ts). */
const MIN_PASSWORD = 8;

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

function displayName(p: Profile): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Your account';
}

function initialsOf(name: string): string {
  return name.split(/\s+/).map((part) => part[0] || '').slice(0, 2).join('').toUpperCase() || '?';
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={'pr-10' + (invalid ? ' border-destructive focus-visible:ring-destructive' : '')}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium">{value}</span>
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { signInWithToken } = useAuth();

  const profile = useQuery<Profile>({
    queryKey: ['auth', 'profile'],
    queryFn: async () => (await api.get('/api/auth/profile')).data,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  useEffect(() => {
    if (!profile.data) return;
    setFirstName(profile.data.firstName || '');
    setLastName(profile.data.lastName || '');
  }, [profile.data]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Every change returns a fresh token: the name travels in it, and this device stays signed in
  // after the others are signed out.
  const adopt = (accessToken?: string) => {
    if (accessToken) signInWithToken(accessToken);
  };

  const saveDetails = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (profile.data?.editableFields.includes('firstName')) body.firstName = firstName;
      if (profile.data?.editableFields.includes('lastName')) body.lastName = lastName;
      return (await api.patch('/api/auth/profile', body)).data as { profile: Profile; accessToken?: string };
    },
    onSuccess: (data) => {
      adopt(data.accessToken);
      queryClient.setQueryData(['auth', 'profile'], data.profile);
      toast.success('Your details were saved.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const changePassword = useMutation({
    mutationFn: async () =>
      (await api.post('/api/auth/change-password', { currentPassword, newPassword })).data as { accessToken?: string; message?: string },
    onSuccess: (data) => {
      adopt(data.accessToken);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(data.message || 'Your password was changed.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const signOutOthers = useMutation({
    mutationFn: async () => (await api.post('/api/auth/sign-out-other-sessions')).data as { accessToken?: string },
    onSuccess: (data) => {
      adopt(data.accessToken);
      setConfirmSignOut(false);
      toast.success('Every other session was signed out.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (profile.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-80" />
          <div className="space-y-6">
            <Skeleton className="h-56" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5" /> Your profile could not be loaded. {errorMessage(profile.error)}
        </CardContent>
      </Card>
    );
  }

  const p = profile.data;
  const name = displayName(p);
  const canEditFirst = p.editableFields.includes('firstName');
  const canEditLast = p.editableFields.includes('lastName');
  const detailsChanged =
    (canEditFirst && firstName.trim() !== (p.firstName || '')) || (canEditLast && lastName.trim() !== (p.lastName || ''));
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD;
  const canChangePassword =
    currentPassword.length > 0 && newPassword.length >= MIN_PASSWORD && confirmPassword === newPassword && !changePassword.isPending;
  const memberSince = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details, your password and where you are signed in.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Who you are ── */}
        <Card className="overflow-hidden lg:sticky lg:top-4">
          <div aria-hidden="true" className="h-20 bg-gradient-to-br from-primary/80 via-primary to-primary/70" />
          <CardContent className="-mt-10 space-y-5 pb-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 border-4 border-card shadow-sm">
                <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">{initialsOf(name)}</AvatarFallback>
              </Avatar>
              <h2 className="mt-3 text-lg font-semibold leading-tight">{name}</h2>
              {p.email && <p className="mt-0.5 text-sm text-muted-foreground">{p.email}</p>}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {p.roleName && <Badge variant="secondary">{p.roleName}</Badge>}
                {p.isPlatformAdmin && (
                  <Badge className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Platform admin
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-3 border-t pt-5">
              {p.email && <MetaRow icon={Mail} label="Email" value={p.email} />}
              {memberSince && <MetaRow icon={CalendarDays} label="Member since" value={memberSince} />}
              <MetaRow
                icon={p.passwordSignIn ? KeyRound : MailCheck}
                label="Signs in with"
                value={p.passwordSignIn ? (p.hasPassword ? 'Email and password' : 'Email (no password set yet)') : 'A one-time code by email'}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* ── Personal details ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4 text-muted-foreground" /> Personal details
              </CardTitle>
              <CardDescription>How your name appears to other people in this app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-first">First name</Label>
                  <Input id="profile-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!canEditFirst} autoComplete="given-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-last">Last name</Label>
                  <Input id="profile-last" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!canEditLast} autoComplete="family-name" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="profile-email" value={p.email || ''} readOnly className="bg-muted/50 pl-9 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">You sign in with this address. Ask an administrator to change it.</p>
                </div>
              </div>
              {(canEditFirst || canEditLast) && (
                <div className="flex justify-end border-t pt-4">
                  <Button onClick={() => saveDetails.mutate()} disabled={!detailsChanged || saveDetails.isPending}>
                    {saveDetails.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Password ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-muted-foreground" /> Password
              </CardTitle>
              <CardDescription>
                Changing it signs you out on every other device, and we email you to confirm it was you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!p.passwordSignIn ? (
                <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  This app signs you in with a one-time code sent to your email, so there is no password to change.
                </p>
              ) : !p.hasPassword ? (
                <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Your account has no password yet. Use the link in your invitation email, or choose “Forgot password?” on the sign-in page.
                </p>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canChangePassword) changePassword.mutate();
                  }}
                >
                  <div className="space-y-2 sm:max-w-sm">
                    <Label htmlFor="profile-current">Current password</Label>
                    <PasswordInput id="profile-current" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profile-new">New password</Label>
                      <PasswordInput id="profile-new" value={newPassword} onChange={setNewPassword} autoComplete="new-password" invalid={tooShort} />
                      <p className={'text-xs ' + (tooShort ? 'text-destructive' : 'text-muted-foreground')}>
                        At least {MIN_PASSWORD} characters.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-confirm">Repeat new password</Label>
                      <PasswordInput id="profile-confirm" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" invalid={mismatch} />
                      {mismatch ? (
                        <p className="text-xs text-destructive">The two passwords do not match.</p>
                      ) : confirmPassword && !tooShort ? (
                        <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> They match.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-end border-t pt-4">
                    <Button type="submit" disabled={!canChangePassword}>
                      {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Change password
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* ── Sessions ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MonitorSmartphone className="h-4 w-4 text-muted-foreground" /> Where you are signed in
              </CardTitle>
              <CardDescription>
                Signed in on a computer you no longer use, or think someone else might be? End every other session.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">You stay signed in here.</p>
              <Button variant="outline" onClick={() => setConfirmSignOut(true)}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out of all other sessions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmSignOut} onOpenChange={(open) => { if (!signOutOthers.isPending) setConfirmSignOut(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign out of all other sessions?</DialogTitle>
            <DialogDescription>
              Every other browser and device signed in to your account is signed out at once. You stay signed in here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmSignOut(false)} disabled={signOutOthers.isPending}>
              Cancel
            </Button>
            <Button onClick={() => signOutOthers.mutate()} disabled={signOutOthers.isPending}>
              {signOutOthers.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign out other sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
