import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type DashboardEntry, type OrgRow, errorMessage, useSaveDashboard } from './api';

/**
 * Add a dashboard by pasting the embed code copied from the Dashboard Engine — or, for an existing
 * entry, rename it or replace its code.
 *
 * The code is read by the server (src/dashboard-engine/embed-code.ts), which keeps only what it
 * needs and stores the access token encrypted. The quick check below only helps the person see,
 * before saving, whether they pasted the right thing.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing entry. */
  entry?: DashboardEntry | null;
  isOwner: boolean;
  /** Organizations the owner can target (owner only). */
  organizations: OrgRow[];
  engineUrl: string | null;
}

interface QuickCheck {
  ok: boolean;
  kind?: 'dashboard' | 'widget';
  id?: string;
  hasToken?: boolean;
  problem?: string;
}

function quickCheck(code: string): QuickCheck | null {
  const text = code.trim();
  if (!text) return null;
  const src = /<iframe\b/i.test(text)
    ? (text.match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find(Boolean) ?? '')
    : text;
  const flat = src.replace(/&amp;/gi, '&').replace(/\s+/g, '');
  const match = flat.match(/\/embed\/(dashboard|widget)\/([A-Za-z0-9-]{1,64})(?:[/?#]|$)/);
  if (!match) return { ok: false, problem: 'This does not look like a Dashboard Engine embed code.' };
  if (match[2] === 'YOUR_DASHBOARD_ID') return { ok: false, problem: 'This is the example code. Copy the code from the dashboard itself.' };
  const token = flat.match(/[?&#]token=([^&#]+)/)?.[1] ?? '';
  if (/\.\.\.$|…$/.test(token)) return { ok: false, problem: 'This code shows a shortened token. Copy the full code.' };
  return { ok: true, kind: match[1] as 'dashboard' | 'widget', id: match[2], hasToken: token.length >= 10 };
}

export function AddDashboardDialog({ open, onOpenChange, entry, isOwner, organizations, engineUrl }: Props) {
  const editing = Boolean(entry);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<string>('all');
  const save = useSaveDashboard();

  useEffect(() => {
    if (!open) return;
    setCode('');
    setTitle(entry?.title ?? '');
    setDescription(entry?.description ?? '');
    setAudience(entry?.organizationId ? String(entry.organizationId) : 'all');
  }, [open, entry]);

  const check = useMemo(() => quickCheck(code), [code]);
  const needsCode = !editing;
  const canSave = !save.isPending && title.trim().length > 0 && (needsCode ? Boolean(check?.ok) : !code.trim() || Boolean(check?.ok));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    save.mutate(
      {
        id: entry?.id,
        code: code.trim() || undefined,
        title: title.trim(),
        description: description.trim(),
        ...(editing || !isOwner ? {} : { organizationId: audience === 'all' ? 'all' : Number(audience) }),
      },
      {
        onSuccess: () => {
          toast.success(editing ? 'Saved the dashboard.' : `Added "${title.trim()}".`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !save.isPending && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit dashboard' : 'Add a dashboard'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Rename it, or paste a new embed code to replace the one it uses.'
                : 'Paste the embed code of a dashboard from the Dashboard Engine.'}
            </DialogDescription>
          </DialogHeader>

          {!editing && (
            <ol className="space-y-1.5 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">1.</span> In the Dashboard Engine, open the dashboard.</li>
              <li><span className="font-medium text-foreground">2.</span> Click <span className="font-medium text-foreground">Embed</span>, add an embed token, and copy the embed code.</li>
              <li><span className="font-medium text-foreground">3.</span> Paste it below.</li>
              {engineUrl && (
                <li className="pt-1">
                  <a
                    href={engineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open the Dashboard Engine <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </li>
              )}
            </ol>
          )}

          <div className="space-y-2">
            <Label htmlFor="dd-code">{editing ? 'New embed code (optional)' : 'Embed code'}</Label>
            <Textarea
              id="dd-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={'<iframe src="https://…/embed/dashboard/…?token=…"></iframe>'}
              rows={4}
              spellCheck={false}
              autoComplete="off"
              className="font-mono text-xs"
              aria-describedby="dd-code-check"
            />
            <div id="dd-code-check" aria-live="polite" className="min-h-5 text-sm">
              {check && !check.ok && (
                <p className="flex items-start gap-1.5 text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {check.problem}
                </p>
              )}
              {check?.ok && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    {check.kind === 'widget' ? 'Widget' : 'Dashboard'} <span className="font-mono text-xs">{check.id}</span>
                  </span>
                  {check.hasToken ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <KeyRound className="h-4 w-4" aria-hidden /> Access token included, stored encrypted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" aria-hidden /> No access token: it will not display yet
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dd-title">Name in the sidebar</Label>
            <Input id="dd-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Finance overview" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dd-description">Description (optional)</Label>
            <Input
              id="dd-description"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Revenue, expenses and cash flow by month"
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="dd-audience">Show to</Label>
              {isOwner ? (
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger id="dd-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All organizations</SelectItem>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}{o.enabled ? '' : ' (dashboards off)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p id="dd-audience" className="rounded-md border bg-muted/40 px-3 py-2 text-sm">Your organization</p>
              )}
              <p className="text-xs text-muted-foreground">
                Who sees it inside the organization is still decided by the dashboard's permissions in the Dashboard Engine.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave} aria-busy={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {editing ? 'Save' : 'Add dashboard'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
