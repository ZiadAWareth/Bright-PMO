import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, Database, GitBranch,
  HelpCircle, ListChecks, Pencil, Send, Sparkles, User, Wand2, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIChatResponse } from './workflowAIService';
import type { WorkflowDefinition, WorkflowNode } from './workflowService';
import { useWorkflowCatalog } from './useWorkflowCatalog';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: AIChatResponse;
}

/** How each family of steps looks: an icon and a tone, so the flow reads at a glance. */
const FAMILY: Record<string, { Icon: typeof Zap; tone: string; word: string }> = {
  trigger: { Icon: Zap, tone: 'bg-primary text-primary-foreground', word: 'Starts when' },
  human: { Icon: User, tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', word: 'A person' },
  data: { Icon: Database, tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', word: 'Records' },
  integration: { Icon: Send, tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', word: 'Sends' },
  control: { Icon: GitBranch, tone: 'bg-muted text-foreground', word: 'Decides' },
  time: { Icon: Clock, tone: 'bg-muted text-foreground', word: 'Waits' },
  ai: { Icon: Sparkles, tone: 'bg-primary/10 text-primary', word: 'AI' },
};
const familyOf = (category: string) => FAMILY[category] || { Icon: Circle, tone: 'bg-muted text-foreground', word: 'Step' };

/** "integration.sendEmail" -> "Send email": a readable name when the catalogue has none. */
function words(type: string): string {
  const last = String(type || '').split('.').pop() || 'step';
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Up to two settings of a step, as "Label: value" — enough to see what it will do. */
function settingsOf(node: WorkflowNode): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(node.config || {})) {
    if (out.length >= 2) break;
    if (value === null || value === undefined || value === '' || typeof value === 'object') continue;
    if (/(^id$|Id$|position)/.test(key)) continue;
    const text = String(value).trim();
    if (!text || text.length > 80) continue;
    out.push(words(key) + ': ' + text);
  }
  return out;
}

interface Step { node: WorkflowNode; via?: string; }

/** The steps in the order the workflow runs: breadth-first from the trigger, then any stragglers. */
function orderSteps(wf: WorkflowDefinition): Step[] {
  const nodes = wf.nodes || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const next = new Map<string, Array<{ to: string; label?: string }>>();
  for (const e of wf.edges || []) {
    if (!next.has(e.from)) next.set(e.from, []);
    next.get(e.from)!.push({ to: e.to, label: e.condition });
  }
  const steps: Step[] = [];
  const seen = new Set<string>();
  const queue: Array<{ id: string; via?: string }> = nodes.filter((n) => n.kind === 'trigger').map((n) => ({ id: n.id }));
  while (queue.length) {
    const { id, via } = queue.shift()!;
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    steps.push({ node: byId.get(id)!, via });
    const outs = next.get(id) || [];
    for (const o of outs) queue.push({ id: o.to, via: outs.length > 1 && o.label ? o.label : undefined });
  }
  for (const n of nodes) if (!seen.has(n.id)) steps.push({ node: n });
  return steps;
}

function WorkflowPreview({ data, onApply, onRefine }: {
  data: AIChatResponse;
  onApply: () => void;
  onRefine: () => void;
}) {
  const [open, setOpen] = useState(true);
  const { data: catalog } = useWorkflowCatalog();
  const pulses = useMemo(() => new Map((catalog?.pulses || []).map((p) => [p.type, p])), [catalog]);
  const steps = useMemo(() => (data.workflow ? orderSteps(data.workflow) : []), [data.workflow]);
  const visible = steps.filter((s) => !/^control.end/.test(s.node.type || ''));
  const issues = data.validation || [];

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm" data-testid="workflow-preview">
      <div className="flex items-start gap-3 border-b bg-muted/40 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{data.name || 'New workflow'}</div>
          <div className="text-xs text-muted-foreground">
            {data.entity ? 'On ' + data.entity + ' · ' : ''}
            {visible.length} step{visible.length === 1 ? '' : 's'}
            {issues.length ? ' · ' + issues.length + ' to check' : ' · ready to apply'}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setOpen((s) => !s)}
          aria-label={open ? 'Hide the steps' : 'Show the steps'} aria-expanded={open}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {open ? (
        <ol className="max-h-80 space-y-0 overflow-auto px-4 py-3" aria-label="Steps of the workflow">
          {visible.map((step, i) => {
            const pulse = pulses.get(step.node.type);
            const family = familyOf(pulse?.category || String(step.node.type || '').split('.')[0] || step.node.kind);
            const name = step.node.label || pulse?.label || words(step.node.type);
            const settings = settingsOf(step.node);
            return (
              <li key={step.node.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < visible.length - 1 ? (
                  <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" />
                ) : null}
                <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', family.tone)}>
                  <family.Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {i === 0 ? 'When' : 'Step ' + i}
                    </span>
                    {step.via ? (
                      <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">If {step.via}</span>
                    ) : null}
                  </div>
                  <div className="text-[13px] font-medium text-foreground">{name}</div>
                  {pulse?.description && i === 0 ? (
                    <div className="text-xs text-muted-foreground">{pulse.description}</div>
                  ) : null}
                  {settings.length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {settings.map((s) => (
                        <span key={s} className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {issues.length ? (
        <div className="flex items-start gap-2 border-t border-amber-500/30 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div className="space-y-0.5">
            <div className="font-semibold">Check before you apply</div>
            {issues.map((v, i) => <div key={i}>{v}</div>)}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
          Nothing changes until you apply it
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onRefine}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />Refine
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onApply}>
            <Wand2 className="h-3.5 w-3.5" aria-hidden />Apply to canvas
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowAIMessage({
  message,
  onApply,
  onRefine,
}: {
  message: ChatMessage;
  onApply: (wf: WorkflowDefinition | null, meta?: { name?: string; entity?: string }) => void;
  onRefine?: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-[13px] leading-relaxed text-primary-foreground">
        {message.content}
      </div>
    );
  }

  const data = message.data ?? ({} as AIChatResponse);
  const ready = data.intent === 'generate' || data.intent === 'modify';

  return (
    <div className="flex max-w-[94%] flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          {ready ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : <HelpCircle className="h-3.5 w-3.5" aria-hidden />}
        </span>
        {data.intent === 'generate' ? 'Here is your workflow' : data.intent === 'modify' ? 'I updated your workflow' : 'A quick question'}
      </div>

      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-[13px] leading-relaxed text-foreground">
        <p className="whitespace-pre-wrap">{data.message || message.content}</p>
      </div>

      {data.questions && data.questions.length > 0 ? (
        <div className="rounded-xl border bg-background p-3 text-[13px]">
          <p className="mb-1.5 font-medium text-foreground">To get it right, tell me:</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            {data.questions.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
        </div>
      ) : null}

      {data.workflow && (data.workflow.nodes?.length ?? 0) > 0 ? (
        <WorkflowPreview data={data}
          onApply={() => onApply(data.workflow ?? null, { name: data.name, entity: data.entity })}
          onRefine={() => (onRefine ? onRefine() : onApply(null))} />
      ) : null}

      {data.validation && data.validation.length > 0 && !data.workflow ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div>{data.validation.map((v, i) => <div key={i}>{v}</div>)}</div>
        </div>
      ) : null}
    </div>
  );
}
