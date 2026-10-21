import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useFeature } from '@/lib/features';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

/** GET /api/agent/agents/:id — the full row, instructions included. */
interface AgentDetail {
  id: string;
  name: string;
  role: string | null;
  instructions: string;
  allowedEntities: string[];
  allowedTools: string[];
  webSearch: boolean;
  modelOverride: string | null;
  maxIterations: number | null;
  outputSchema: Record<string, unknown> | null;
}
interface AgentOptions {
  entities: string[];
  tools: string[];
}

/** Plain-language names for the three tools, so the form is not a list of function names. */
const TOOL_LABEL: Record<string, string> = {
  describe_app: 'Describe the app — its tables, fields and relations',
  query_data: 'Read records — filter, sort and count',
  analyze_metric: 'Analyse trends — totals and comparisons over time',
  read_run_history: 'Check workflow runs — whether automations ran, and why one failed',
};

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] }; status?: number } })
    .response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/**
 * A ceiling, shown as a ceiling.
 *
 * "Nothing selected" and "everything allowed" are different answers and the UI has to say which
 * one it means, because reading an empty list as "allow everything" is the expensive mistake in
 * this whole area. An untouched agent has no ceiling; the moment one box is ticked, the unticked
 * ones are refused.
 */
function CeilingList({
  id,
  title,
  hint,
  options,
  selected,
  labels,
  onToggle,
  locked,
}: {
  id: string;
  title: string;
  hint: string;
  options: string[];
  selected: string[];
  labels?: Record<string, string>;
  onToggle: (name: string, on: boolean) => void;
  /** Ticked and fixed, with why (describe_app comes with any other tool). */
  locked?: { name: string; note: string } | null;
}) {
  return (
    <fieldset className="space-y-2" aria-describedby={id + '-hint'}>
      <div>
        <legend className="text-sm font-medium">{title}</legend>
        <p id={id + '-hint'} className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
        {options.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">Nothing to choose from.</p>
        ) : (
          options.map((name) => {
            const fixed = locked?.name === name;
            return (
              <label key={name} className="flex items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted/50">
                <Checkbox
                  className="mt-0.5"
                  checked={fixed || selected.includes(name)}
                  disabled={fixed}
                  onCheckedChange={(on) => onToggle(name, on === true)}
                />
                <span>
                  {labels?.[name] ?? name}
                  {fixed ? <span className="block text-[11px] text-muted-foreground">{locked!.note}</span> : null}
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length === 0
          ? 'Nothing ticked — this agent can reach none of these.'
          : `${selected.length + (locked && !selected.includes(locked.name) ? 1 : 0)} of ${options.length} allowed.`}
      </p>
    </fieldset>
  );
}

/** One titled part of the form: a heading and a line on what it decides, then its fields. */
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

const EMPTY = {
  name: '',
  role: '',
  instructions: '',
  allowedEntities: [] as string[],
  allowedTools: [] as string[],
  webSearch: false,
  modelOverride: '',
  maxIterations: '' as string,
  outputSchema: '',
};

/**
 * New agent / Edit agent — its own page (/agent/agents/new, /agent/agents/:id/edit), laid out like
 * every record form in the app, instead of a dialog over the list.
 */
export default function AgentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = useFeature('aiSettings');
  const [form, setForm] = useState({ ...EMPTY });
  const [schemaError, setSchemaError] = useState('');
  // The app's model unless this agent is told otherwise — the choice is shown, never implied.
  const [ownModel, setOwnModel] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  // The app's own AI (Provider & Key): what a blank Model means, and whether agents can run at all.
  const { data: appAi } = useQuery({
    queryKey: ['agent', 'config'],
    retry: false,
    queryFn: async () => (await api.get('/api/agent/config')).data as { configured: boolean; provider: string; model: string; providers?: Array<{ id: string; label?: string }> },
  });
  const appProvider = appAi ? appAi.providers?.find((p) => p.id === appAi.provider)?.label ?? appAi.provider : '';
  const { data: options } = useQuery({
    queryKey: ['agent', 'agent-options'],
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get('/api/agent/agent-options')).data as AgentOptions,
  });
  // Editing needs the one field the list withholds (instructions), so this page reads the full row.
  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['agent', 'agents', id],
    enabled: isEdit,
    queryFn: async () => (await api.get(`/api/agent/agents/${id}`)).data as AgentDetail,
  });

  useEffect(() => {
    if (!detail) return;
    setForm({
      name: detail.name,
      role: detail.role ?? '',
      instructions: detail.instructions,
      allowedEntities: detail.allowedEntities ?? [],
      allowedTools: detail.allowedTools ?? [],
      webSearch: !!detail.webSearch,
      modelOverride: detail.modelOverride ?? '',
      maxIterations: detail.maxIterations == null ? '' : String(detail.maxIterations),
      outputSchema: detail.outputSchema ? JSON.stringify(detail.outputSchema, null, 2) : '',
    });
    setOwnModel(Boolean(detail.modelOverride));
  }, [detail]);

  const save = useMutation({
    mutationFn: async () => {
      // Parsed here so a typo is a message under the box rather than a 400 from the server. The
      // server still validates — this is a courtesy, not the check.
      let outputSchema: Record<string, unknown> | null = null;
      if (form.outputSchema.trim()) {
        try {
          outputSchema = JSON.parse(form.outputSchema);
        } catch {
          setSchemaError('This is not valid JSON.');
          throw new Error('Output schema is not valid JSON.');
        }
      }
      setSchemaError('');
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        instructions: form.instructions.trim(),
        allowedEntities: form.allowedEntities,
        allowedTools: form.allowedTools,
        webSearch: form.webSearch,
        modelOverride: ownModel ? form.modelOverride.trim() : '',
        maxIterations: form.maxIterations ? Number(form.maxIterations) : undefined,
        outputSchema,
      };
      return isEdit
        ? (await api.put(`/api/agent/agents/${id}`, payload)).data
        : (await api.post('/api/agent/agents', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'agents'] });
      toast.success(isEdit ? 'Agent updated.' : 'Agent created.');
      navigate('/agent/agents');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const toggle = (key: 'allowedEntities' | 'allowedTools') => (name: string, on: boolean) =>
    set({ [key]: on ? [...form[key], name] : form[key].filter((n) => n !== name) } as never);

  const back = () => navigate('/agent/agents');
  const header = (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={back} aria-label="Back to agents">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{isEdit ? `Edit ${detail?.name ?? 'agent'}` : 'New agent'}</h1>
        <p className="text-sm text-muted-foreground">
          An agent reads and reasons. It never writes — when a workflow should act on what it found, the workflow acts.
        </p>
      </div>
    </div>
  );

  if (!canManage) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5" /> Only an administrator can add or change agents.
          </CardContent>
        </Card>
      </div>
    );
  }
  if (isEdit && (error as { response?: { status?: number } } | null)?.response?.status === 404) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">This agent no longer exists.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <Card>
        <CardContent className="pt-6">
          {(isEdit && isLoading) || !options ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : (
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <Section title="Who it is" hint="The name workflow designers pick it by, and one line on what it does.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-name">Name</Label>
                    <Input id="agent-name" required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ticket triage" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-role">Role</Label>
                    <Input id="agent-role" value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Sorts incoming tickets by urgency" />
                  </div>
                </div>
              </Section>

              <Section title="Instructions" hint="What this agent is for, in your own words. It is added to what the app already tells the agent about itself.">
                <Textarea
                  id="agent-instructions"
                  aria-label="Instructions"
                  rows={8}
                  value={form.instructions}
                  onChange={(e) => set({ instructions: e.target.value })}
                  placeholder="You sort support tickets. Judge urgency from the description and the customer's plan…"
                />
              </Section>

              <Section title="What it may reach" hint="Ceilings, never grants: the agent still cannot see more than the person it runs as.">
                <div className="grid gap-4 md:grid-cols-2">
                  <CeilingList
                    id="agent-tables"
                    title="Tables it may read"
                    hint="Only the ticked tables, and only what its person may see in them."
                    options={options.entities}
                    selected={form.allowedEntities}
                    onToggle={toggle('allowedEntities')}
                  />
                  <CeilingList
                    id="agent-tools"
                    title="What it may do"
                    hint="An agent with no tools can read nothing, and will answer from nothing."
                    options={options.tools}
                    labels={TOOL_LABEL}
                    selected={form.allowedTools}
                    onToggle={toggle('allowedTools')}
                    // The engine adds it to any other tool: every tool needs the table names it reads.
                    locked={
                      form.allowedTools.some((t) => t !== 'describe_app')
                        ? { name: 'describe_app', note: 'Always on with any other tool — they need it to know your tables.' }
                        : null
                    }
                  />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox className="mt-0.5" checked={form.webSearch} onCheckedChange={(on) => set({ webSearch: on === true })} />
                  <span>
                    <span className="font-medium">May search the web</span>
                    <span className="block text-xs text-muted-foreground">
                      Uses the provider's own search on this app's key (Anthropic or OpenAI). Web facts are listed under the answer as
                      external sources and shown to a person before anything acts on them.
                    </span>
                  </span>
                </label>
              </Section>

              <Section
                title="Model and answer"
                hint="Every agent runs on the app's AI provider and key (Provider & Key). These only fine-tune it — blank uses the app's settings."
              >
                {appAi && !appAi.configured ? (
                  <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    This app has no AI provider set up yet, so agents cannot run.{' '}
                    <Link to="/agent/settings" className="font-medium underline">
                      Add a key on Provider &amp; Key
                    </Link>
                    .
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <fieldset className="space-y-2">
                    <legend className="mb-1.5 text-sm font-medium">Model</legend>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="radio" name="agent-model-choice" className="mt-0.5 accent-primary" checked={!ownModel} onChange={() => setOwnModel(false)} />
                      <span>
                        <span className="font-medium">Same as the app</span>
                        <span className="block text-xs text-muted-foreground">
                          {appAi?.configured ? `${appProvider} · ${appAi.model}` : 'The model set on Provider & Key'} — follows it if it changes.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input type="radio" name="agent-model-choice" className="mt-0.5 accent-primary" checked={ownModel} onChange={() => setOwnModel(true)} />
                      <span>
                        <span className="font-medium">A different model</span>
                        <span className="block text-xs text-muted-foreground">Same provider and key, another of its models — e.g. a stronger one for a hard job.</span>
                      </span>
                    </label>
                    {ownModel ? (
                      <Input
                        id="agent-model"
                        aria-label="Model name"
                        autoFocus
                        required
                        value={form.modelOverride}
                        onChange={(e) => set({ modelOverride: e.target.value })}
                        placeholder={appAi?.provider === 'anthropic' ? 'e.g. claude-haiku-4-5' : 'e.g. gpt-4.1-mini'}
                      />
                    ) : null}
                  </fieldset>
                  <div className="space-y-1.5">
                    <Label htmlFor="agent-iterations">Max model calls (1–8)</Label>
                    <Input
                      id="agent-iterations"
                      type="number"
                      min={1}
                      max={8}
                      value={form.maxIterations}
                      onChange={(e) => set({ maxIterations: e.target.value })}
                      placeholder="The app default"
                      aria-describedby="agent-iterations-hint"
                    />
                    <p id="agent-iterations-hint" className="text-xs text-muted-foreground">
                      Every call costs tokens, and an agent inside a loop pays once per item.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent-schema">Output schema (JSON Schema)</Label>
                  <Textarea
                    id="agent-schema"
                    rows={6}
                    className="font-mono text-xs"
                    value={form.outputSchema}
                    onChange={(e) => {
                      set({ outputSchema: e.target.value });
                      if (schemaError) setSchemaError('');
                    }}
                    aria-invalid={!!schemaError}
                    aria-describedby="agent-schema-hint"
                    placeholder={'{\n  "type": "object",\n  "properties": { "severity": { "type": "string" } }\n}'}
                  />
                  {schemaError ? (
                    <p role="alert" className="text-xs font-medium text-destructive">{schemaError}</p>
                  ) : null}
                  <p id="agent-schema-hint" className="text-xs text-muted-foreground">
                    With a schema, a workflow can branch on a typed field. Without one it can only read the agent's prose, which the
                    next model version will word differently.
                  </p>
                </div>
              </Section>

              <div className="flex justify-end gap-2 border-t pt-5">
                <Button type="button" variant="outline" onClick={back} disabled={save.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending || !form.name.trim()}>
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? 'Save changes' : 'Create agent'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
