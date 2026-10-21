import { useMemo, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Info, KeyRound, Link2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The webhook trigger's address, shown where it is configured — so the person setting it up can
 * hand it to the other system without guessing the host, the method or how to send the secret.
 *
 * Mirrors the receiving endpoint (webhook.controller.ts): /api/webhooks/<path> on this app's API
 * host, the configured method only, the secret in the X-Webhook-Secret header (or ?secret=), and
 * only while the workflow is ACTIVE. The path rule is the server's (validateWebhookPath).
 */

const PATH_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** The API host the admin panel talks to; the same origin when no separate API host is set. */
function apiBase(): string {
  const env = (import.meta as any).env?.VITE_API_URL as string | undefined;
  const base = env && env.trim() ? env.trim() : typeof window !== 'undefined' ? window.location.origin : '';
  return base.replace(/\/+$/, '');
}

export function webhookUrl(path: string): string {
  return apiBase() + '/api/webhooks/' + encodeURIComponent(path.trim());
}

export function webhookPathProblem(path: string): string | null {
  const p = path.trim();
  if (!p) return null; // "required" is reported by the form itself
  if (!PATH_RULE.test(p)) return 'Use letters, digits, dots, dashes and underscores only (no spaces or slashes), up to 128.';
  return null;
}

/** The body a test call sends: the trigger's example body, compact; a stand-in when there is none. */
export function exampleBodyText(sample: unknown): string {
  if (sample && typeof sample === 'object') return JSON.stringify(sample);
  const raw = String(sample ?? '').trim();
  if (!raw) return '{"example": true}';
  try {
    return JSON.stringify(JSON.parse(raw));
  } catch {
    return '{"example": true}';
  }
}

export interface WebhookCallResult {
  ok: boolean;
  text: string;
  runId?: string;
}

/**
 * A REAL call to this workflow's webhook, from the browser: the secret as ?secret= (a custom header
 * would need the API to allow it cross-origin). The server answers with the run it started.
 */
export async function callWebhook(opts: { path: string; method?: string; secret?: string; body: string }): Promise<WebhookCallResult> {
  const verb = String(opts.method || 'POST').toUpperCase();
  const hasBody = verb !== 'GET' && verb !== 'DELETE';
  const url = webhookUrl(opts.path);
  try {
    const target = opts.secret ? url + '?secret=' + encodeURIComponent(opts.secret) : url;
    const res = await fetch(target, {
      method: verb,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? opts.body : undefined,
    });
    const reply = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, text: 'Run ' + String(reply?.status || 'started').toLowerCase(), runId: reply?.runId };
    if (res.status === 404) return { ok: false, text: 'Not found: save and activate the workflow first.' };
    if (res.status === 401) return { ok: false, text: 'Refused: the saved secret differs from this one. Save first.' };
    if (res.status === 405) return { ok: false, text: 'Refused: the saved method differs. Save first.' };
    return { ok: false, text: reply?.message ? String(reply.message) : 'Failed (' + res.status + ')' };
  } catch {
    return { ok: false, text: 'Could not reach the app.' };
  }
}

const inputCls =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* the text stays selectable */
        }
      }}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={'Copy ' + label}
    >
      {done ? <Check className="h-3 w-3 text-primary" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/** The path box, then the full address and how to call it. */
export default function WebhookPathField({
  value,
  method,
  secret,
  sampleBody,
  onChange,
}: {
  value: string;
  method?: string;
  secret?: string;
  /** The trigger's example body (its typed sample payload): what the example request and the test call send. */
  sampleBody?: unknown;
  onChange: (path: string) => void;
}) {
  const path = value ?? '';
  const problem = webhookPathProblem(path);
  const verb = String(method || 'POST').toUpperCase();
  const url = path.trim() && !problem ? webhookUrl(path) : '';
  const hasBody = verb !== 'GET' && verb !== 'DELETE';
  const body = useMemo(() => exampleBodyText(sampleBody), [sampleBody]);
  const [helpOpen, setHelpOpen] = useState(false);

  const curl = useMemo(() => {
    if (!url) return '';
    const parts = ['curl -X ' + verb + " '" + url + "'"];
    if (secret) parts.push("  -H 'X-Webhook-Secret: <your secret>'");
    if (hasBody) parts.push("  -H 'Content-Type: application/json'", "  -d '" + body + "'");
    return parts.join(' \\\n');
  }, [url, verb, secret, hasBody, body]);

  return (
    <div className="space-y-2">
      <input
        value={path}
        onChange={(e) => onChange(e.target.value)}
        placeholder="new-order"
        spellCheck={false}
        aria-invalid={!!problem}
        aria-describedby="webhook-path-help"
        className={cn(inputCls, 'font-mono', problem && 'border-destructive')}
      />
      {problem ? (
        <p id="webhook-path-help" className="text-xs text-destructive">
          {problem}
        </p>
      ) : null}

      <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Link2 className="h-3.5 w-3.5 text-primary" aria-hidden /> Webhook URL
          </span>
          {url ? (
            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              aria-expanded={helpOpen}
              aria-controls="webhook-help"
              className={cn(
                'grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                helpOpen && 'bg-background text-primary',
              )}
              title="How to call it"
              aria-label="How to call this webhook"
            >
              <Info className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {url ? (
          <>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">{verb}</span>
              <code className="min-w-0 flex-1 select-all break-all rounded bg-background px-2 py-1.5 font-mono text-xs text-foreground ring-1 ring-border">
                {url}
              </code>
              <CopyButton text={url} label="webhook URL" />
            </div>
            {/* The one thing worth seeing without asking: an open webhook. */}
            {!secret ? (
              <p className="flex items-center gap-1.5 text-[11.5px] text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> No secret: anyone with this URL can start the workflow.
              </p>
            ) : null}
            {helpOpen ? (
              <div id="webhook-help" className="space-y-2 rounded-md border border-border bg-background p-2.5">
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>
                    Send <strong className="font-medium text-foreground">{verb}</strong> requests only{hasBody ? ', with a JSON body' : ''}. The body
                    reaches the workflow as <code className="font-mono">payload</code>.
                  </li>
                  {secret ? (
                    <li>
                      Send the secret in the <code className="font-mono">X-Webhook-Secret</code> header (or as <code className="font-mono">?secret=</code>).
                    </li>
                  ) : null}
                  <li>It answers only while the workflow is saved and active; otherwise callers get “not found”.</li>
                </ul>
                <div className="flex items-start gap-2">
                  <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted/50 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-foreground ring-1 ring-border">
                    {curl}
                  </pre>
                  <CopyButton text={curl} label="example request" />
                </div>
              </div>
            ) : null}
            {/* Calling it is done from the step's Input pane, where the call's data then appears. */}
            <p className="text-[11.5px] text-muted-foreground">
              To see what a call sends, use <span className="font-medium text-foreground">Send a test call</span> in the Input pane, or call this URL from your system.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Enter a path above to get this workflow's address.</p>
        )}
      </div>
    </div>
  );
}

/** The shared secret: hidden by default, with a generator for a strong one. */
export function WebhookSecretField({ value, onChange }: { value: string; onChange: (secret: string) => void }) {
  const [shown, setShown] = useState(false);
  const generate = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    onChange(Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''));
    setShown(true);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type={shown ? 'text' : 'password'}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="No secret"
            autoComplete="new-password"
            spellCheck={false}
            className={cn(inputCls, 'pr-9 font-mono')}
          />
          {value ? (
            <button
              type="button"
              onClick={() => setShown((s) => !s)}
              className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={shown ? 'Hide secret' : 'Show secret'}
            >
              {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          ) : null}
        </div>
        {value ? <CopyButton text={value} label="secret" /> : null}
        <button
          type="button"
          onClick={generate}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden /> {value ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      {value ? <p className="text-xs text-amber-700 dark:text-amber-400">Changing it stops callers that still send the old one.</p> : null}
    </div>
  );
}
