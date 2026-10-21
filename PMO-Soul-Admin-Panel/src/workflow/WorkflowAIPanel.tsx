import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, X, Maximize2, Minimize2, Sparkles, RotateCcw, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import WorkflowAIMessage, { type ChatMessage } from './WorkflowAIMessage';
import workflowAIService from './workflowAIService';
import type { WorkflowDefinition } from './workflowService';
import { useEntityNames } from './useWorkflowCatalog';

/** "LoanRequest" -> "loan request", for an example prompt in the app's own words. */
const words = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

/**
 * Example prompts built from THIS app's records. Fixed examples named records most apps do not have
 * ("order", "lead"), and the assistant could only answer them with a question.
 */
function hintsFor(entities: string[]): string[] {
  const own = entities.filter((e) => !['User', 'RolesAndPermissions', 'Organization', 'Notification', 'Workflow'].includes(e));
  const a = own[0] ?? entities[0];
  if (!a) return ['Notify the admins when a record is created'];
  const b = own[1] ?? a;
  return [
    `When a ${words(a)} is created, notify the admins`,
    `Email the owner when a ${words(b)} is updated`,
    `Check a ${words(a)} before it is saved`,
  ];
}

export default function WorkflowAIPanel({
  open,
  onClose,
  onApplyWorkflow,
  currentWorkflow,
}: {
  open: boolean;
  onClose: () => void;
  onApplyWorkflow: (wf: WorkflowDefinition, meta?: { name?: string; entity?: string }) => void;
  currentWorkflow: WorkflowDefinition | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const hints = hintsFor(useEntityNames());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Is a model configured? Asked of the server without any outbound call. No key is a state, not
  // an error: the panel says what to do and offers no question box to type into.
  const health = useQuery<{ configured: boolean; reason?: string }>({
    queryKey: ['agent', 'health', 'workflow-ai'],
    queryFn: async () => (await api.get('/api/agent/health')).data,
    enabled: open,
    staleTime: 30_000,
    retry: false,
  });
  const notConfigured = !!health.data && health.data.configured === false;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      // The model only knows what the transcript tells it. An assistant turn that produced a
      // workflow carries that workflow and its validation problems, so "fix that" has
      // something to fix even before the draft is applied to the canvas.
      const history = messages.map((m) => ({
        role: m.role,
        content:
          m.role === 'user'
            ? m.content
            : [
                m.data?.message || m.content,
                m.data?.workflow ? 'WORKFLOW JSON: ' + JSON.stringify(m.data.workflow) : '',
                m.data?.validation?.length ? 'VALIDATION PROBLEMS TO FIX: ' + m.data.validation.join(' | ') : '',
              ]
                .filter(Boolean)
                .join('\n'),
      }));
      const response = await workflowAIService.chat(text, history, currentWorkflow);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.message, data: response }]);
    } catch (err) {
      // The server's own sentence (no key, a rejected key, the provider's rate limit), not
      // "Request failed with status code 502".
      const res = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
      const said = Array.isArray(res?.message) ? res?.message.join(', ') : res?.message;
      const msg = said || (err instanceof Error ? err.message : 'Unknown error');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: msg, data: { intent: 'clarify', message: msg } },
      ]);
      // A key removed since the panel opened: switch to the "needs a provider" state.
      void health.refetch();
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, currentWorkflow]);

  const handleApply = useCallback(
    (wf: WorkflowDefinition | null, meta?: { name?: string; entity?: string }) => {
      if (wf) onApplyWorkflow(wf, meta);
    },
    [onApplyWorkflow],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Dim backdrop — click to dismiss (mirrors the schema builder's AI modal) */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl',
          expanded ? 'h-[92vh] max-w-6xl' : 'h-[82vh] max-w-3xl',
        )}
      >
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="flex-1 text-[13px] font-semibold text-foreground">Build with AI</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessages([])} disabled={!messages.length}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded((s) => !s)}>
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
        {notConfigured && messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <KeyRound className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">Build with AI needs an AI provider</p>
            <p className="max-w-sm text-[12.5px] text-muted-foreground">
              This app has no AI key yet, so the assistant cannot design workflows. An administrator can add one in{' '}
              <span className="font-medium text-foreground">AI → Provider &amp; Key</span>; it works straight away after.
            </p>
            <Button asChild size="sm">
              <Link to="/agent/settings" target="_blank" rel="noreferrer">
                Open Provider &amp; Key
              </Link>
            </Button>
            <button type="button" onClick={() => void health.refetch()} className="text-[11.5px] text-primary hover:underline">
              I added a key, check again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center opacity-80">
            <Sparkles className="h-10 w-10 text-primary/60" />
            <p className="text-sm font-semibold text-foreground">Describe your workflow</p>
            <p className="max-w-[260px] text-[12px] text-muted-foreground">
              Tell me what should happen in your business process and I'll create the workflow for you.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {hints.map((h) => (
                <button
                  key={h}
                  onClick={() => setInput(h)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <WorkflowAIMessage key={i} message={m} onApply={handleApply} onRefine={() => inputRef.current?.focus()} />)
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] italic text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Designing your workflow…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            rows={1}
            placeholder={
              notConfigured
                ? 'Add an AI key first (AI → Provider & Key)'
                : messages.length
                  ? 'Ask for a change, e.g. also notify the manager…'
                  : 'Describe your business process…'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || notConfigured}
            className="max-h-28 min-h-[40px] resize-none text-[13px]"
          />
          <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSend} disabled={!input.trim() || loading || notConfigured} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
      </div>
    </div>
  );
}
