import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, CircleDashed, Eye, EyeOff, KeyRound, Loader2, Save, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Mirrors AgentConfigView in src/agent/ai-settings.service.ts. */
interface ProviderOption {
  id: string;
  /** Display name ("OpenAI"). Optional so an older backend that sends only ids still renders. */
  label?: string;
  wireFormat: string;
  defaultModel: string;
  defaultBaseUrl: string;
  requiresBaseUrl: boolean;
  webSearch: boolean;
}
interface AgentConfigView {
  provider: string;
  wireFormat: string;
  baseUrl: string;
  model: string;
  configured: boolean;
  reason?: string;
  hasKey: boolean;
  source: 'settings' | 'environment' | 'none';
  keyHint: string;
  updatedAt: string | null;
  updatedByEmail: string | null;
  assistantWebSearch: boolean;
  webSearchSupported: boolean;
  providers: ProviderOption[];
}

/** Mirrors AgentHealth in src/agent/agent-health.ts. */
interface AgentHealth {
  reachable: boolean;
  authenticated: boolean;
  supportsTools: boolean | null;
  status?: number;
  error?: string;
}

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] }; status?: number } })
    .response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/** One line of the Test result. `null` means the step was never reached. */
function ProbeLine({ label, value }: { label: string; value: boolean | null }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {value === null ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : value ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
      )}
      <span className={value === false ? 'text-destructive' : undefined}>{label}</span>
    </li>
  );
}

/** One titled part of the page: what it decides on the left, its fields on the right. */
function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t pt-6 first:border-t-0 first:pt-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Provider & Key — the AI service this app's assistant, agents and AI workflow steps use. The top
 * says plainly whether AI is on and WHOSE key it runs on; nothing is configured behind anyone's back.
 */
export default function AgentSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AgentConfigView>({
    queryKey: ['agent', 'config'],
    queryFn: async () => (await api.get('/api/agent/config')).data,
    retry: false,
  });

  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [assistantWebSearch, setAssistantWebSearch] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [customAddress, setCustomAddress] = useState(false);
  const [probe, setProbe] = useState<AgentHealth | null>(null);

  // Seeded from the server: the form shows what is actually in force, including environment values.
  useEffect(() => {
    if (!data) return;
    setProvider(data.provider || '');
    setModel(data.model || '');
    setBaseUrl(data.baseUrl || '');
    setAssistantWebSearch(Boolean(data.assistantWebSearch));
  }, [data]);

  const selected = data?.providers.find((p) => p.id === provider);
  // Judged on the provider being PICKED, not the saved one, so switching to OpenAI enables the
  // toggle before Save. The rule itself lives on the server (web-search.rules.ts).
  const webSearchSupported = selected ? selected.webSearch : Boolean(data?.webSearchSupported);
  const needsAddress = Boolean(selected?.requiresBaseUrl);
  const showAddress = needsAddress || customAddress || Boolean(baseUrl && baseUrl !== selected?.defaultBaseUrl);

  const dirty =
    !!data &&
    (apiKey.trim() !== '' ||
      provider !== (data.provider || '') ||
      model !== (data.model || '') ||
      baseUrl !== (data.baseUrl || '') ||
      assistantWebSearch !== Boolean(data.assistantWebSearch));

  const afterWrite = (updated: AgentConfigView, message: string) => {
    setApiKey('');
    setShowKey(false);
    setProbe(null);
    queryClient.setQueryData(['agent', 'config'], updated);
    // The knowledge page's banner reads this, so it must not keep showing "dormant".
    queryClient.invalidateQueries({ queryKey: ['agent', 'health'] });
    toast.success(message);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | boolean> = { provider, model, baseUrl, assistantWebSearch };
      // An untouched key field must not be sent at all — an empty string means "delete it".
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      return (await api.put('/api/agent/config', payload)).data as AgentConfigView;
    },
    onSuccess: (updated) => afterWrite(updated, 'AI provider settings saved.'),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const removeKey = useMutation({
    mutationFn: async () => (await api.put('/api/agent/config', { apiKey: '' })).data as AgentConfigView,
    onSuccess: (updated) => afterWrite(updated, 'Your key was removed.'),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const test = useMutation({
    mutationFn: async () => (await api.post('/api/agent/health/probe')).data as { health: AgentHealth },
    onSuccess: (result) => setProbe(result.health),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const header = (
    <div className="min-w-0">
      <h1 className="truncate text-2xl font-bold tracking-tight">AI provider</h1>
      <p className="text-sm text-muted-foreground">
        The AI service behind this app's assistant, agents and AI workflow steps — on your own key, billed to your
        provider account.
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // 403 is the expected answer for a non-admin, so it gets a real explanation.
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403 || error || !data) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            {status === 403 ? <ShieldAlert className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {status === 403 ? 'Only an administrator can manage the AI provider.' : 'Could not load the AI provider settings.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const busy = save.isPending || removeKey.isPending || test.isPending;
  const providerName = (id: string) => data.providers.find((p) => p.id === id)?.label ?? id;

  // ── Status: is AI on, and on whose key ──
  const state = data.configured ? (data.source === 'environment' ? 'server' : 'yours') : 'off';
  const STATUS = {
    yours: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />,
      title: 'Connected',
      text: `Using your ${providerName(data.provider)} key ••••${data.keyHint}, saved on this page.`,
      tone: 'border-emerald-500/30 bg-emerald-500/5',
    },
    server: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />,
      title: 'Connected — server setting',
      text: `Using a ${providerName(data.provider)} key set on this app's server (WORKFLOW_AI_API_KEY), ••••${data.keyHint}. Save a key below to use your own instead.`,
      tone: 'border-emerald-500/30 bg-emerald-500/5',
    },
    off: {
      icon: <CircleDashed className="h-5 w-5 text-muted-foreground" aria-hidden />,
      title: 'Not set up',
      text:
        data.reason && data.hasKey
          ? data.reason
          : 'Nothing is sent to any AI provider until you add a key below. The assistant, agents and AI workflow steps stay off until then.',
      tone: 'border-border bg-muted/30',
    },
  }[state];

  return (
    <div className="space-y-6">
      {header}

      <Card className={cn('border', STATUS.tone)}>
        <CardContent className="space-y-3 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3" role="status">
              {STATUS.icon}
              <div className="min-w-0">
                <p className="font-semibold">{STATUS.title}</p>
                <p className="text-sm text-muted-foreground">{STATUS.text}</p>
                {data.configured ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Model <span className="font-mono">{data.model}</span>
                    {data.updatedAt
                      ? ` · updated ${new Date(data.updatedAt).toLocaleString()}${data.updatedByEmail ? ' by ' + data.updatedByEmail : ''}`
                      : ''}
                  </p>
                ) : null}
              </div>
            </div>
            {data.configured ? (
              <Button variant="outline" onClick={() => test.mutate()} disabled={busy}>
                {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Test connection
              </Button>
            ) : null}
          </div>
          {probe ? (
            <div className="rounded-md border bg-card p-3" aria-live="polite">
              <p className="mb-2 text-xs font-medium text-muted-foreground">One real request was sent to the provider:</p>
              <ul className="space-y-1.5">
                <ProbeLine label="The provider responded" value={probe.reachable} />
                <ProbeLine label="The key was accepted" value={probe.authenticated} />
                <ProbeLine
                  label={probe.supportsTools === null ? 'Tool calling was not tested' : 'The model supports tool calling'}
                  value={probe.supportsTools}
                />
              </ul>
              {probe.supportsTools === false ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  This model works for plain answers, but the assistant and agents need tool calling to look anything up.
                  Choose a model that supports it.
                </p>
              ) : null}
              {probe.error ? <p className="mt-2 text-sm text-destructive">{probe.error}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Section title="Provider and model" hint="Which AI company answers, and which of its models. Agents use this model unless one sets its own.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={provider || undefined}
                    onValueChange={(value) => {
                      setProvider(value);
                      // Cleared so the new provider's own defaults apply. Carrying a Groq model
                      // name over to OpenAI would fail at the first real request.
                      setModel('');
                      setBaseUrl('');
                      setCustomAddress(false);
                    }}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Choose a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.providers.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label ?? option.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    autoComplete="off"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={selected?.defaultModel ? `${selected.defaultModel} (default)` : 'The provider default'}
                    aria-describedby="model-hint"
                  />
                  <p id="model-hint" className="text-xs text-muted-foreground">
                    Blank uses the provider's default model.
                  </p>
                </div>
              </div>

              {showAddress ? (
                <div className="space-y-1.5">
                  <Label htmlFor="baseUrl">
                    Address (base URL){needsAddress ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  <Input
                    id="baseUrl"
                    autoComplete="off"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={selected?.defaultBaseUrl || 'https://…'}
                    aria-describedby="baseUrl-hint"
                  />
                  <p id="baseUrl-hint" className="text-xs text-muted-foreground">
                    {needsAddress
                      ? 'This provider has no standard address, so yours is required (e.g. your Azure resource).'
                      : 'Only for a proxy or a self-hosted gateway. Blank uses the provider’s standard address.'}
                  </p>
                </div>
              ) : provider ? (
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setCustomAddress(true)}>
                  Use a custom address (proxy or gateway)
                </button>
              ) : null}
            </Section>

            <Section
              title="API key"
              hint="Created in your provider's dashboard. Stored encrypted in this app's own database and never shown again."
            >
              <div className="space-y-1.5">
                <Label htmlFor="apiKey">{data.source === 'settings' && data.hasKey ? 'Replace the key' : 'Key'}</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={data.source === 'settings' && data.hasKey ? `Leave blank to keep ••••${data.keyHint}` : 'Paste your key'}
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? 'Hide the key' : 'Show the key'}
                    className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {data.source === 'settings' && data.hasKey ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Saved key <span className="font-mono text-foreground">••••{data.keyHint}</span>
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeKey.mutate()} disabled={busy}>
                    {removeKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Remove key
                  </Button>
                </div>
              ) : null}
            </Section>

            <Section title="Web search" hint="Lets the assistant look things up on the web. Billed to the same key.">
              <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="assistantWebSearch">Let the assistant search the web</Label>
                  <p className="text-xs text-muted-foreground">
                    {webSearchSupported
                      ? "Uses the provider's own search. Web facts are listed under the answer as external sources."
                      : 'Available with OpenAI or Anthropic only — not with this provider.'}
                  </p>
                </div>
                <Switch
                  id="assistantWebSearch"
                  checked={assistantWebSearch && webSearchSupported}
                  onCheckedChange={setAssistantWebSearch}
                  disabled={busy || !webSearchSupported}
                />
              </div>
            </Section>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
              {dirty ? <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Unsaved changes</span> : null}
              <Button type="submit" disabled={busy || !dirty || (needsAddress && !baseUrl.trim())}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
