import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  History,
  KeyRound,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Search,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/components/agent/markdown';

/**
 * The data assistant: its conversation (AssistantChat), shared by the full-screen Assistant page and
 * the Ask panel (ask-panel.tsx).
 */

/** Mirrors describeAiConfig in src/agent/ai-config.ts. */
interface AgentHealthView {
  configured: boolean;
  reason?: string;
  provider: string;
  providerLabel?: string;
  model: string;
  /** The AI Provider page's switch, and whether this provider can honour it. */
  assistantWebSearch?: boolean;
  webSearchSupported?: boolean;
}

/** The footer's web-search label: silent when off, honest when on but impossible. */
function webSearchLabel(health: AgentHealthView | undefined): string {
  if (!health?.assistantWebSearch) return '';
  return health.webSearchSupported ? ' · web search on' : ' · web search unavailable for this provider';
}

/** Mirrors AgentToolInvocation in src/agent/agent.runtime.ts. */
interface Invocation {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  summary?: string;
  durationMs: number;
}

interface AskResponse {
  conversationId: string;
  runId: string | null;
  answer: string;
  /** Pre-folded on the server, e.g. `Ticket (7 rows)`. Empty when the run read no records. */
  sources?: string | null;
  invocations: Invocation[];
  iterations: number;
  stoppedEarly: boolean;
  usage: { inputTokens: number; outputTokens: number };
}

interface ThreadSummary {
  id: string;
  title: string | null;
  surface: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  seq: number;
  role: string;
  content: string;
  runId: string | null;
  /** The same line the live answer showed. This is what makes provenance survive a refresh —
   *  the tool trace beside it is still session-only, and deliberately so. */
  sources: string | null;
  createdAt: string;
}

interface ThreadDetail extends ThreadSummary {
  messages: StoredMessage[];
}

/** Mirrors AgentProgress in src/agent/agent.runtime.ts. */
type Progress =
  | { type: 'thinking'; iteration: number }
  | { type: 'tool'; invocation: Invocation };

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

/**
 * Runs one question against POST /agent/ask/stream and reports progress as it arrives.
 *
 * Read with `fetch` rather than `EventSource` on purpose: EventSource is GET-only and cannot
 * set an Authorization header, so using it would mean putting the bearer token in the query
 * string, where it would be written to every access log along the way.
 */
async function askStreaming(
  body: Record<string, string>,
  onProgress: (event: Progress) => void
): Promise<AskResponse> {
  const response = await fetch((api.defaults.baseURL ?? '') + '/api/agent/ask/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    // The server writes its SSE headers lazily, so anything that failed before the first
    // event is still an ordinary JSON error with a real status code.
    const detail = await response.json().catch(() => null);
    const message = (detail as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    const err = new Error(text || 'The assistant could not be reached.');
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AskResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line. Whatever follows the last blank line is a partial
    // event still on the wire, so it stays in the buffer until the rest of it arrives.
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data:')) continue;
      const event = JSON.parse(line.slice(5).trim());
      if (event.type === 'error') throw new Error(event.message);
      if (event.type === 'done') result = event as AskResponse;
      else onProgress(event as Progress);
    }
  }

  // A stream that ends without an answer is a dropped connection, not a silent success.
  if (!result) throw new Error('The assistant stopped before it finished answering.');
  return result;
}

/** What the agent is doing right now, shown while the answer is still being worked out. */
function LiveSteps({ steps }: { steps: Progress[] }) {
  const tools = steps.filter((step) => step.type === 'tool') as Extract<Progress, { type: 'tool' }>[];
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {tools.length ? 'Working through your data…' : 'Reading your data…'}
      </span>
      {tools.map((step, index) => (
        <div key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          {step.invocation.ok ? (
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
          ) : (
            <X className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
          )}
          <span>
            <span className="font-medium">{step.invocation.name}</span>
            {step.invocation.summary ? ' — ' + step.invocation.summary : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * What the answer was read from, e.g. `Ticket (7 rows) · User (2 rows)`.
 *
 * Always visible, never behind a toggle — that is the whole point of it. The tool trace below
 * is a debugging affordance someone opens when an answer looks wrong; this is the standing
 * claim that the answer came from records rather than from the model's memory, and a claim
 * nobody sees is not a claim.
 *
 * Rendered from the STORED value on the message, not from session state, so a reopened thread
 * shows exactly what the live answer showed. Null means the run read no records — shown as
 * nothing rather than as "no sources", because an empty line reads like a failure when the
 * honest reading is "this question did not need the database".
 */
function Sources({ line }: { line?: string | null }) {
  if (!line) return null;

  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Database className="h-3 w-3 shrink-0" />
      <span>Sources: {line}</span>
    </span>
  );
}

/**
 * The tool calls behind one answer, collapsed by default.
 *
 * This is the single most useful thing on the page when an answer looks wrong: it turns
 * "the AI is bad" into "it queried the wrong field", which is fixable. Collapsed because it is
 * a debugging affordance, not the answer.
 */
function ToolTrace({ invocations }: { invocations: Invocation[] }) {
  const [open, setOpen] = useState(false);
  if (!invocations.length) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3" />
        {invocations.length} tool {invocations.length === 1 ? 'call' : 'calls'}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-md border bg-muted/40 p-2">
          {invocations.map((invocation, index) => (
            <div key={index} className="text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={invocation.ok ? 'secondary' : 'destructive'}>{invocation.name}</Badge>
                <span className="text-muted-foreground">{invocation.durationMs} ms</span>
              </div>
              {invocation.summary && (
                <div className="mt-1 text-muted-foreground">{invocation.summary}</div>
              )}
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-snug text-muted-foreground">
                {JSON.stringify(invocation.args)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({ role, children, wide }: { role: string; children: React.ReactNode; wide?: boolean }) {
  const mine = role === 'user';
  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          mine
            ? cn('rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground', wide ? 'max-w-[90%]' : 'max-w-[80%]')
            // min-w-0 so a wide answer table scrolls inside the bubble instead of widening the page.
            : cn('min-w-0 rounded-lg bg-muted px-4 py-3 text-sm', wide ? 'max-w-full' : 'max-w-[85%]')
        }
      >
        {children}
      </div>
    </div>
  );
}

/** What the assistant is told about where the person is, and the chip that shows it. */
export interface AskContext {
  /** Shown above the composer, e.g. "KitchenSink #5". */
  label: string;
  /** Sent with the question (systemPrompt) so "this record" means something. */
  prompt: string;
}

/** Today / Yesterday / Previous 7 days / Older — the way a long history is scanned. */
function groupThreads(items: ThreadSummary[]): Array<{ label: string; items: ThreadSummary[] }> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const groups: Record<string, ThreadSummary[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] };
  for (const t of items) {
    const at = new Date(t.updatedAt || t.createdAt).getTime();
    const key =
      at >= startOfToday.getTime()
        ? 'Today'
        : at >= startOfToday.getTime() - day
          ? 'Yesterday'
          : at >= startOfToday.getTime() - 7 * day
            ? 'Previous 7 days'
            : 'Older';
    groups[key].push(t);
  }
  return Object.entries(groups)
    .filter(([, list]) => list.length)
    .map(([label, list]) => ({ label, items: list }));
}

/** One conversation in the list: open it, rename it in place, or delete it (after confirming). */
function ThreadItem({
  item,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  item: ThreadSummary;
  active: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.title || '');
  const title = item.title || 'Untitled conversation';
  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== (item.title || '')) onRename(next);
    else setValue(item.title || '');
  };

  if (editing) {
    return (
      <div className="px-1 py-0.5">
        <Input
          autoFocus
          value={value}
          maxLength={120}
          aria-label="Conversation name"
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setValue(item.title || '');
              setEditing(false);
            }
          }}
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-lg pr-1 transition-colors',
        active ? 'bg-primary/10 text-foreground' : 'text-foreground/90 hover:bg-muted',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        onDoubleClick={() => setEditing(true)}
        aria-current={active ? 'true' : undefined}
        className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={title}
      >
        <span className={cn(active && 'font-medium')}>{title}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={'Options for ' + title}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * The data assistant's conversation — ONE implementation behind both places it appears:
 *   - variant "page":  the full-screen Assistant (conversation list, titled transcript, composer);
 *   - variant "panel": the Ask panel that slides in beside any page (one column, history on demand,
 *                      aware of the page it was opened on).
 * It reads and answers; it never changes a record.
 */
export function AssistantChat({
  variant = 'page',
  context,
  onClose,
}: {
  variant?: 'page' | 'panel';
  /** Panel only: the page the person is on. Re-read for every question, so it follows navigation. */
  context?: () => AskContext | null;
  onClose?: () => void;
}) {
  const panel = variant === 'panel';
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  /** The question currently in flight, shown immediately so the page does not look frozen. */
  const [pending, setPending] = useState<string | null>(null);
  /**
   * Tool traces and usage for answers produced in THIS session, keyed by run id.
   *
   * Deliberately not persisted. The server stores the steps in AgentRunStep, but there is no
   * route to read them back yet, so a thread reopened after a refresh shows its answers without
   * their traces. Better an honest gap than a fake one.
   */
  const [traces, setTraces] = useState<Record<string, AskResponse>>({});
  /** Progress events for the run in flight. Cleared the moment the answer lands. */
  const [steps, setSteps] = useState<Progress[]>([]);
  /** Panel: the history list instead of the transcript. Page: the list on a narrow screen. */
  const [showHistory, setShowHistory] = useState(false);
  /** Panel: the page context can be dropped for a question that is not about this page. */
  const [useContext, setUseContext] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ThreadSummary | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const here = panel && context ? context() : null;

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const health = useQuery<AgentHealthView>({
    queryKey: ['agent', 'health'],
    queryFn: async () => (await api.get('/api/agent/health')).data,
    retry: false,
  });

  const threads = useQuery<ThreadSummary[]>({
    queryKey: ['agent', 'conversations'],
    queryFn: async () => (await api.get('/api/agent/conversations')).data,
    retry: false,
  });

  const thread = useQuery<ThreadDetail>({
    queryKey: ['agent', 'conversation', conversationId],
    queryFn: async () => (await api.get('/api/agent/conversations/' + conversationId)).data,
    enabled: Boolean(conversationId),
    retry: false,
  });

  const ask = useMutation({
    mutationFn: async (question: string) => {
      const body: Record<string, string> = { question, surface: panel ? 'panel' : 'assistant' };
      if (conversationId) body.conversationId = conversationId;
      // Where the person is, so "this record" and "here" mean something. Read at send time.
      const where = panel && useContext && context ? context() : null;
      if (where) body.systemPrompt = where.prompt;
      try {
        return await askStreaming(body, (event) => setSteps((prev) => [...prev, event]));
      } catch (err) {
        // Only for an expired token. `fetch` has none of axios's proactive-renew-and-replay
        // logic, so rather than duplicating it here the plain route — which does — is asked
        // to run the question instead. Nothing was spent on the attempt that 401'd.
        if ((err as { status?: number }).status !== 401) throw err;
        return (await api.post('/api/agent/ask', body)).data as AskResponse;
      }
    },
    onSuccess: (result) => {
      if (result.runId) setTraces((prev) => ({ ...prev, [result.runId as string]: result }));
      setSteps([]);
      setPending(null);
      // A brand new thread only gets its id back here, so this is also what switches the view
      // from "no conversation" to "this conversation".
      setConversationId(result.conversationId);
      queryClient.invalidateQueries({ queryKey: ['agent', 'conversation', result.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['agent', 'conversations'] });
    },
    onError: (err, question) => {
      setSteps([]);
      setPending(null);
      // Handed back rather than discarded: the question may have taken thought to write, and
      // a failure here is usually transient (a rate limit, a provider hiccup).
      setDraft(question);
      toast.error(errorMessage(err));
    },
  });

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      (await api.patch('/api/agent/conversations/' + id, { title })).data,
    onSuccess: (_r, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['agent', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['agent', 'conversation', id] });
      toast.success('Conversation renamed.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete('/api/agent/conversations/' + id),
    onSuccess: (_result, id) => {
      if (id === conversationId) setConversationId(null);
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['agent', 'conversations'] });
      toast.success('Conversation deleted.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const messages = useMemo(() => thread.data?.messages ?? [], [thread.data]);
  const current = threads.data?.find((t) => t.id === conversationId) ?? null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = threads.data ?? [];
    return q ? list.filter((t) => (t.title || '').toLowerCase().includes(q)) : list;
  }, [threads.data, search]);

  // Scrolls on any change to the transcript OR to the in-flight question, so the newest thing
  // is visible whether it is an answer arriving or a question being sent.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending, steps]);

  // Opens ready to type.
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const send = (text?: string) => {
    const question = (text ?? draft).trim();
    if (!question || ask.isPending) return;
    setDraft('');
    setSteps([]);
    setShowHistory(false);
    setPending(question);
    ask.mutate(question);
  };

  const open = (id: string) => {
    setConversationId(id);
    setShowHistory(false);
    setEditingTitle(false);
  };

  const startNew = () => {
    setConversationId(null);
    setDraft('');
    setSteps([]);
    setPending(null);
    setShowHistory(false);
    setUseContext(true);
    setEditingTitle(false);
    inputRef.current?.focus();
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      toast.error('Could not copy — select the text instead.');
    }
  };

  const modelLabel = health.data ? (health.data.providerLabel ?? health.data.provider) + ' · ' + health.data.model : '';
  // The same initials as the top bar's avatar (user-menu.tsx): first + last name, else the email.
  const initials = ([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'You')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const deleteDialog = confirmDelete ? (
    <Dialog open onOpenChange={(o) => (o ? null : setConfirmDelete(null))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this conversation?</DialogTitle>
          <DialogDescription>
            “{confirmDelete.title || 'Untitled conversation'}” and its messages are removed for good. The record of what the
            assistant read (for auditing and billing) is kept.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => remove.mutate(confirmDelete.id)} disabled={remove.isPending}>
            {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  const threadList = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {threads.isLoading ? (
        <div className="space-y-2 p-1">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      ) : null}
      {threads.data && filtered.length === 0 ? (
        <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
          {threads.data.length ? 'No conversation matches.' : 'No conversations yet. Ask your first question.'}
        </p>
      ) : null}
      {groupThreads(filtered).map((group) => (
        <div key={group.label} className="mb-3">
          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <ThreadItem
                key={item.id}
                item={item}
                active={item.id === conversationId}
                onOpen={() => open(item.id)}
                onRename={(title) => rename.mutate({ id: item.id, title })}
                onDelete={() => setConfirmDelete(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="h-8 pl-8 text-sm" />
    </div>
  );

  const panelHeader = (
    <div className="flex items-center gap-1 border-b px-3 py-2">
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Ask</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">About your data · never changes anything</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={startNew} title="New conversation" aria-label="New conversation">
        <MessageSquarePlus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', showHistory && 'bg-accent text-foreground')}
        onClick={() => setShowHistory((v) => !v)}
        title="Conversations"
        aria-label="Conversations"
        aria-pressed={showHistory}
      >
        <History className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Open full screen">
        <Link to="/agent/assistant" aria-label="Open full screen" onClick={onClose}>
          <Maximize2 className="h-4 w-4" />
        </Link>
      </Button>
      {onClose ? (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Close (Esc)" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );

  if (health.isLoading) {
    return panel ? (
      <div className="flex h-full flex-col">
        {panelHeader}
        <div className="space-y-3 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    ) : (
      <Skeleton className="h-[70vh] w-full rounded-xl" />
    );
  }

  // Dormant is a first-class state, not an error: the app ships without a key on purpose, and
  // the fix is a specific action by a specific person rather than something to debug.
  if (health.data && !health.data.configured) {
    const dormant = (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <KeyRound className="h-6 w-6" />
        </span>
        <div className="text-lg font-semibold">The assistant is not switched on yet</div>
        <p className="max-w-md text-sm text-muted-foreground">
          {health.data.reason || 'No AI provider is configured for this app.'} An administrator can add a provider key, and
          the assistant starts working immediately.
        </p>
        <Button asChild>
          <Link to="/agent/settings" onClick={onClose}>
            Go to AI Provider settings
          </Link>
        </Button>
      </div>
    );
    return panel ? (
      <div className="flex h-full flex-col">
        {panelHeader}
        {dormant}
      </div>
    ) : (
      <div className="rounded-xl border bg-card">{dormant}</div>
    );
  }

  // Starters for an empty conversation: about this page in the panel, about the app otherwise.
  const starters = here
    ? ['Summarise this record', 'What is related to this record?', 'Anything unusual here?']
    : ['What changed this week?', 'How many records does each table have?', 'Which workflows failed recently?', 'Who are the most active users?'];

  const answerMeta = (message: StoredMessage) => {
    const trace = message.runId ? traces[message.runId] : undefined;
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Sources line={message.sources} />
        {trace ? (
          <span className="text-[11px] text-muted-foreground">
            {trace.usage.inputTokens} in / {trace.usage.outputTokens} out tokens{trace.stoppedEarly ? ' · stopped early' : ''}
          </span>
        ) : null}
        {!panel ? (
          <button
            type="button"
            onClick={() => copy(message.id, message.content)}
            className="inline-flex items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Copy answer"
          >
            {copied === message.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            {copied === message.id ? 'Copied' : 'Copy'}
          </button>
        ) : null}
        {trace ? <ToolTrace invocations={trace.invocations} /> : null}
      </div>
    );
  };

  /** Page: the assistant writes across the column beside its mark; your questions sit on the right. */
  const pageMessage = (message: StoredMessage) =>
    message.role === 'assistant' ? (
      <div key={message.id} className="flex gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <Markdown text={message.content} />
          {answerMeta(message)}
        </div>
      </div>
    ) : (
      <div key={message.id} className="flex justify-end gap-3">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground" aria-hidden>
          {initials}
        </span>
      </div>
    );

  const panelMessage = (message: StoredMessage) => (
    <div key={message.id}>
      <Bubble role={message.role} wide>
        {message.role === 'assistant' ? <Markdown text={message.content} /> : <div className="whitespace-pre-wrap">{message.content}</div>}
      </Bubble>
      {message.role === 'assistant' && (message.sources || (message.runId && traces[message.runId])) ? (
        <div className="pl-1">{answerMeta(message)}</div>
      ) : null}
    </div>
  );

  const emptyState = (
    <div className="m-auto flex w-full max-w-xl flex-col items-center gap-3 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <div className="text-xl font-semibold tracking-tight">{panel ? 'Ask about your data' : 'What would you like to know?'}</div>
      <p className="max-w-md text-sm text-muted-foreground">
        Answered from this app's live records, within your own permissions — not from memory. If something cannot be found,
        the assistant says so instead of guessing.
      </p>
      <div className={cn('mt-2 grid w-full gap-2', panel ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-xl border bg-background px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  const transcript = (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', panel ? 'p-3' : 'px-4 py-6 sm:px-6')} aria-live="polite">
      <div className={cn('flex min-h-full flex-col gap-5', !panel && 'mx-auto max-w-3xl')}>
        {!conversationId && !pending ? emptyState : null}
        {thread.isLoading && conversationId ? <Skeleton className="h-24 w-full" /> : null}
        {messages.map((m) => (panel ? panelMessage(m) : pageMessage(m)))}
        {pending ? (
          panel ? (
            <>
              <Bubble role="user" wide>
                <div className="whitespace-pre-wrap">{pending}</div>
              </Bubble>
              <Bubble role="assistant" wide>
                <LiveSteps steps={steps} />
              </Bubble>
            </>
          ) : (
            <>
              <div className="flex justify-end gap-3">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{pending}</div>
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground" aria-hidden>
                  {initials}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="text-sm">
                  <LiveSteps steps={steps} />
                </div>
              </div>
            </>
          )
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );

  const composer = (
    <div className={cn(panel ? 'border-t p-3' : 'px-4 pb-4 sm:px-6')}>
      <div className={cn(!panel && 'mx-auto max-w-3xl')}>
        {here ? (
          <div className="mb-2 flex items-center gap-1.5 text-[11px]">
            {useContext ? (
              <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-0.5 pl-2 pr-0.5 text-primary">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">About: {here.label}</span>
                <button
                  type="button"
                  onClick={() => setUseContext(false)}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full hover:bg-primary/10"
                  aria-label="Ask without this page"
                  title="Ask without this page"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setUseContext(true)} className="text-muted-foreground hover:text-foreground hover:underline">
                + About {here.label}
              </button>
            )}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
          <Textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            // Enter sends, Shift+Enter makes a new line — the convention every chat UI uses,
            // so doing anything else here is a surprise rather than a choice.
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={panel ? 'Ask about your data…' : 'Ask about your records, users, tasks or workflows…'}
            aria-label="Your question"
            rows={panel ? 2 : 1}
            className="max-h-48 min-h-[44px] resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            disabled={ask.isPending}
          />
          <Button onClick={() => send()} disabled={ask.isPending || !draft.trim()} size="icon" className="h-9 w-9 shrink-0 rounded-xl" aria-label="Send">
            {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">
            Answers come from this app's live data and your own permissions
            {health.data ? ' · ' + (health.data.providerLabel ?? health.data.provider) + ' ' + health.data.model : ''}
            {webSearchLabel(health.data)}
          </span>
        </p>
      </div>
    </div>
  );

  if (panel) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {panelHeader}
        {showHistory ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
            {searchBox}
            {threadList}
          </div>
        ) : (
          <>
            {transcript}
            {composer}
          </>
        )}
        {deleteDialog}
      </div>
    );
  }

  const commitTitle = () => {
    setEditingTitle(false);
    const next = titleDraft.trim();
    if (current && next && next !== (current.title || '')) rename.mutate({ id: current.id, title: next });
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card">
      {/* Conversations — yours only, the same on every device you sign in from. */}
      <aside
        className={cn(
          'w-full shrink-0 flex-col gap-3 border-r bg-muted/30 p-3 md:flex md:w-72',
          showHistory ? 'flex' : 'hidden',
        )}
        aria-label="Conversations"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-sm font-semibold">Conversations</p>
          <Button size="sm" className="h-8 gap-1.5" onClick={startNew}>
            <MessageSquarePlus className="h-4 w-4" /> New
          </Button>
        </div>
        {searchBox}
        {threadList}
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" /> Only you can see your conversations.
        </p>
      </aside>

      <section className={cn('min-w-0 flex-1 flex-col', showHistory ? 'hidden md:flex' : 'flex')}>
        <header className="flex items-center gap-2 border-b px-4 py-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setShowHistory(true)} aria-label="Show conversations">
            <PanelLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            {editingTitle && current ? (
              <Input
                autoFocus
                value={titleDraft}
                maxLength={120}
                aria-label="Conversation name"
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="h-8 max-w-md text-sm font-semibold"
              />
            ) : (
              <h1 className="truncate text-sm font-semibold">{current ? current.title || 'Untitled conversation' : 'New conversation'}</h1>
            )}
            {modelLabel ? <p className="truncate text-[11px] text-muted-foreground">{modelLabel}</p> : null}
          </div>
          {current ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Conversation options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={() => {
                    setTitleDraft(current.title || '');
                    setEditingTitle(true);
                  }}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setConfirmDelete(current)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 md:hidden" onClick={startNew}>
            <MessageSquarePlus className="h-4 w-4" /> New
          </Button>
        </header>
        {transcript}
        {composer}
      </section>
      {deleteDialog}
    </div>
  );
}
