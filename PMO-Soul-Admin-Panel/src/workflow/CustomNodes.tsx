import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import {
  ArrowRightLeft, Bell, Bolt, CircleCheck, CirclePlus, CircleX, Clock, FileText, GitBranch, GitFork,
  GitMerge, Globe, Hash, List, Loader2, Lock, Mail, Merge, Octagon, Pencil, Play, Plug, Plus, RefreshCw,
  Repeat, RotateCw, Route, Search, Server, ShieldCheck, Shuffle, Sigma, Sparkles, Split, Timer, Trash2,
  TrendingUp, TriangleAlert, UserCheck, UserPlus, Variable, Webhook, Zap, Check, X, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowCatalog } from './useWorkflowCatalog';
import { branchesFor, hasErrorEdge, hasDefaultFlow, isLoop, type Branch, type BranchSource } from './branches';

/** Tile size in px. The node's box IS the tile; its name sits underneath, outside the box. */
export const TILE = 72;

/** The icon each pulse declares (meta.icon) → its lucide component. Unknown names fall back to the category's. */
const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, 'git-merge': GitMerge, 'x-circle': CircleX, 'check-circle': CircleCheck,
  'trending-up': TrendingUp, function: Sigma, 'git-branch': GitBranch, repeat: Repeat, 'git-fork': GitFork,
  'file-text': FileText, merge: Merge, split: Split, route: Route, octagon: Octagon,
  'alert-triangle': TriangleAlert, 'shield-check': ShieldCheck, 'rotate-cw': RotateCw, plus: Plus,
  'user-plus': UserPlus, trash: Trash2, 'trash-2': Trash2, hash: Hash, lock: Lock,
  'arrow-right-left': ArrowRightLeft, list: List, search: Search, variable: Variable, shuffle: Shuffle,
  edit: Pencil, 'user-check': UserCheck, server: Server, plug: Plug, globe: Globe, bell: Bell, mail: Mail,
  timer: Timer, play: Play, 'plus-circle': CirclePlus, 'refresh-cw': RefreshCw, clock: Clock, webhook: Webhook,
};

/** Category colour, by the pulse type's namespace. Colour lives on the icon, never on the frame. */
const CATEGORY: Record<string, { text: string; icon: LucideIcon }> = {
  trigger: { text: 'text-amber-500', icon: Zap },
  control: { text: 'text-slate-500 dark:text-slate-300', icon: GitBranch },
  data: { text: 'text-sky-600 dark:text-sky-400', icon: Bolt },
  identity: { text: 'text-sky-600 dark:text-sky-400', icon: UserPlus },
  integration: { text: 'text-emerald-600 dark:text-emerald-400', icon: Bolt },
  human: { text: 'text-violet-600 dark:text-violet-400', icon: UserCheck },
  time: { text: 'text-rose-500 dark:text-rose-400', icon: Clock },
  ai: { text: 'text-fuchsia-600 dark:text-fuchsia-400', icon: Sparkles },
};

/** The JavaScript mark (black JS on yellow), for the Run JavaScript pulse. */
export function JavaScriptLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label="JavaScript" className={className}>
      <rect width="32" height="32" rx="6" fill="#F7DF1E" />
      <text x="28" y="27" textAnchor="end" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontWeight="800" fontSize="15" fill="#000">
        JS
      </text>
    </svg>
  );
}

/**
 * A pulse's mark: a brand logo where one exists (Run JavaScript), else its own declared icon in
 * its category colour. Shared by the canvas tiles and the components panel.
 */
export function PulseIcon({ type, icon, className }: { type?: string; icon?: string; className?: string }) {
  if (type === 'data.runCode') return <JavaScriptLogo className={cn('rounded-[5px]', className)} />;
  const ns = (type || '').split('.')[0];
  const cat = CATEGORY[ns] ?? CATEGORY.data;
  const Icon = (icon && ICONS[icon]) || cat.icon;
  return <Icon className={cn(cat.text, className)} strokeWidth={1.8} />;
}

/** Kept for callers that only want a brand logo (undefined when the pulse has none). */
export function glyphFor(pulseType: string | undefined, className: string): React.ReactNode | undefined {
  if (pulseType === 'data.runCode') return <JavaScriptLogo className={className} />;
  return undefined;
}

type RunState = 'running' | 'success' | 'error' | 'skipped' | undefined;
/** A Wait during a test: when it ends (counted down on the tile), and whether it can be skipped. */
type RunInfo = { until?: number; note?: string; skippable?: boolean; label?: string } | undefined;

/** "Waiting 1:42 · Skip" above a Wait while a test waits on it, like n8n's waiting state. */
export function WaitClock({ until, skippable, label }: { until?: number; skippable?: boolean; label?: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil(((until ?? now) - now) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const sec = String(left % 60).padStart(2, '0');
  const text = h ? h + ':' + String(m).padStart(2, '0') + ':' + sec : m + ':' + sec;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary py-0.5 pl-2 pr-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground shadow-sm">
      <span role="status" className="inline-flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> {label || 'Waiting'}
        {until ? <span className="opacity-90">{label ? '· gives up in ' + text : text}</span> : null}
      </span>
      {skippable ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('pulse:skip-wait'));
          }}
          className="nodrag pointer-events-auto rounded-full bg-primary-foreground/20 px-2 py-0.5 hover:bg-primary-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
          title="Skip the rest of this wait and carry on"
        >
          Skip
        </button>
      ) : (
        <span className="pr-1.5" />
      )}
    </span>
  );
}

/** A test run's outcome, as a small badge on the tile's corner. */
function RunBadge({ runState }: { runState: RunState }) {
  if (!runState || runState === 'skipped') return null;
  const cls =
    runState === 'running' ? 'bg-primary text-primary-foreground' : runState === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white';
  const label = runState === 'running' ? 'Running' : runState === 'success' ? 'Ran successfully' : 'Failed';
  return (
    <span title={label} className={cn('absolute -right-2 -top-2 z-10 grid h-5 w-5 place-items-center rounded-full border-2 border-card', cls)}>
      {runState === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : runState === 'success' ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

const HANDLE_CLASS = '!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground';

/** Ask the modeler to open the components panel in "add after this step" mode (see WorkflowModelerPage). */
function requestQuickAdd(sourceId: string, sourceLabel: string) {
  window.dispatchEvent(new CustomEvent('pulse:quick-add', { detail: { sourceId, sourceLabel } }));
}

function NodeShell({
  id,
  kind,
  selected,
  title,
  subtitle,
  runState,
  runInfo,
  loop,
  pulseType,
  icon,
  quickAdd,
  hint,
  runnable,
  children,
}: {
  id: string;
  kind: 'trigger' | 'condition' | 'action' | 'wait';
  selected?: boolean;
  title: string;
  /** One short muted line under the name, only when it adds something. */
  subtitle?: string;
  runState?: RunState;
  runInfo?: RunInfo;
  /** Loop heads get a marker: their body is expected to edge back into them. */
  loop?: boolean;
  pulseType?: string;
  icon?: string;
  /** Show the "+" that adds a connected next step (only for steps with a plain continuation). */
  quickAdd?: boolean;
  /** Tooltip on the tile, when clicking it does something other than open its settings. */
  hint?: string;
  /** Manual Start: a ▶ beside the tile runs the workflow (a test run) without opening anything. */
  runnable?: boolean;
  children?: React.ReactNode;
}) {
  const { deleteElements } = useReactFlow();
  const trigger = kind === 'trigger';
  return (
    <div className="group relative" style={{ width: TILE, height: TILE }}>
      <div
        title={hint}
        className={cn(
          'relative grid h-full w-full place-items-center border bg-card shadow-sm transition-[border-color,box-shadow,opacity]',
          trigger ? 'rounded-l-[36px] rounded-r-2xl' : 'rounded-2xl',
          runState === 'running' || runState === 'error' || selected ? '' : 'border-border hover:border-primary/50',
          selected && 'border-primary shadow-md',
          runState === 'running' && 'border-primary',
          runState === 'error' && 'border-rose-500',
          runState === 'skipped' && 'opacity-50',
        )}
      >
        <PulseIcon type={pulseType} icon={icon} className={cn('h-8 w-8', trigger && 'ml-1.5')} />
        <RunBadge runState={runState} />
        {trigger ? (
          <span className="absolute -left-2 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full border-2 border-card bg-amber-500 text-white">
            <Zap className="h-2.5 w-2.5" fill="currentColor" />
          </span>
        ) : null}
        {loop ? (
          <span title="Loop — connect the body branch back into this step" className="absolute -bottom-2 -left-2 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-card bg-muted text-muted-foreground">
            <Repeat className="h-2.5 w-2.5" />
          </span>
        ) : null}
        <button
          type="button"
          title="Delete step"
          aria-label="Delete step"
          onClick={(e) => {
            e.stopPropagation();
            deleteElements({ nodes: [{ id }] });
          }}
          className={cn(
            'absolute -left-2 -top-2 z-10 grid h-5 w-5 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-opacity hover:border-destructive hover:bg-destructive hover:text-white',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>

      {runnable ? (
        <button
          type="button"
          title="Run this workflow (test run)"
          aria-label="Run this workflow"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('pulse:run-manual'));
          }}
          className="nodrag absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ left: -46 }}
        >
          <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
        </button>
      ) : null}

      {quickAdd ? (
        <button
          type="button"
          title="Add the next step"
          aria-label="Add the next step"
          onClick={(e) => {
            e.stopPropagation();
            requestQuickAdd(id, title);
          }}
          className={cn(
            'nodrag absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-opacity hover:border-primary hover:text-primary',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          style={{ left: TILE + 14 }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {/* A test waiting on this step (countdown), or a wait the test skipped. */}
      {(runState === 'running' && runInfo?.until) || runInfo?.note ? (
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
          {runState === 'running' && runInfo?.until ? (
            <WaitClock until={runInfo.until} skippable={runInfo.skippable} label={runInfo.label} />
          ) : (
            <span className="whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
              {runInfo?.note}
            </span>
          )}
        </div>
      ) : null}

      {/* The name, under the tile: two lines at most, then one optional muted line. */}
      <div className="pointer-events-none absolute left-1/2 top-full mt-2 w-[150px] -translate-x-1/2 text-center">
        <p className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-foreground" title={title}>{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground" title={subtitle}>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * The catalogue entry behind a node — what decides its handles, icon and fallback name.
 *
 * Until the catalogue has loaded (or on an older backend that does not send branch
 * metadata) the helpers fall back to the pulse TYPE, so a user task still shows its
 * completed/overdue handles and a gateway its named branches.
 */
function usePulseEntry(d: Record<string, any>): (BranchSource & { label?: string; icon?: string }) | null {
  const { data } = useWorkflowCatalog();
  const type: string | undefined = d.pulseType || d.triggerType || d.actionType || d.waitType || d.conditionType;
  if (!type) return null;
  return (data?.pulses ?? []).find((p) => p.type === type) ?? { type };
}

/** The one muted line: which pulse a renamed step is. Nothing when the name already says it. */
function pulseSubtitle(title: string, entry: { label?: string } | null): string | undefined {
  const pulse = entry?.label;
  return pulse && pulse.trim().toLowerCase() !== title.trim().toLowerCase() ? pulse : undefined;
}

export function TriggerNode({ id, data, selected }: NodeProps) {
  const d = data as Record<string, any>;
  const entry = usePulseEntry(d);
  const title = d.label || entry?.label || 'Trigger';
  return (
    <NodeShell
      id={id}
      kind="trigger"
      selected={selected}
      title={title}
      subtitle={pulseSubtitle(title, entry)}
      runState={d.runState}
      runInfo={d.runInfo}
      pulseType={d.triggerType}
      icon={entry?.icon}
      quickAdd
      runnable={d.triggerType === 'trigger.manualStart'}
    >
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </NodeShell>
  );
}

/**
 * The gateway-only view kept for callers that predate the catalogue-driven helper: the
 * branches a decision node names in config (cases[].branch + default), Yes/No when none.
 * Every node component below goes through branchesFor(entry, config) instead.
 */
export function branchesOf(config: Record<string, any> | undefined): Branch[] {
  return branchesFor({ dynamicBranches: 'cases' }, config);
}

const BRANCH_COLORS = ['!bg-emerald-500', '!bg-sky-500', '!bg-amber-500', '!bg-violet-500', '!bg-teal-500', '!bg-indigo-500'];

interface Outlet {
  id?: string;
  label: string;
  cls: string;
}

/**
 * The right-hand outlets of a node, in handle order: the plain continuation first (when the
 * pulse has one), then one per declared branch. The engine routes on the edge label
 * matching the branch name, so each branch MUST be its own handle — a node with one
 * handle used to make a Switch fan out to every case and an overdue task look completed.
 */
function outletsFor(entry: BranchSource | null, config: Record<string, any> | undefined): Outlet[] {
  const out: Outlet[] = [];
  if (hasDefaultFlow(entry)) out.push({ id: undefined, label: '', cls: '!bg-muted-foreground' });
  const branches = branchesFor(entry, config);
  branches.forEach((b, i) => {
    const last = branches.length > 1 && i === branches.length - 1 && (b.id === 'false' || b.id === 'overdue' || b.id === 'timeout' || b.id === 'default');
    out.push({ id: b.id, label: b.label, cls: b.id === 'false' || last ? '!bg-rose-500' : BRANCH_COLORS[i % BRANCH_COLORS.length] });
  });
  return out;
}

/**
 * Source handles: one per outlet down the right edge, plus a red 'error' handle at the bottom.
 * A branch's name shows beside its handle only while the step is hovered or selected — once an
 * edge is connected it carries the name itself, so the canvas stays quiet.
 */
function SourceHandles({ outlets, errorEdge, selected }: { outlets: Outlet[]; errorEdge: boolean; selected?: boolean }) {
  const branches = outlets;
  const n = branches.length;
  const named = branches.some((b) => b.label);
  return (
    <>
      {branches.map((b, i) => (
        <Handle
          key={b.id ?? '__default'}
          id={b.id}
          type="source"
          position={Position.Right}
          title={b.label || 'next'}
          style={{ top: ((i + 0.5) / n) * 100 + '%' }}
          className={'!h-2.5 !w-2.5 !border-2 !border-background ' + b.cls}
        />
      ))}
      {named
        ? branches.map((b, i) =>
            b.label ? (
              <span
                key={'label-' + (b.id ?? '__default')}
                className={cn(
                  'pointer-events-none absolute whitespace-nowrap rounded bg-card/90 px-1 text-[10px] font-semibold leading-4 text-muted-foreground transition-opacity',
                  selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
                style={{ left: TILE + 10, top: 'calc(' + ((i + 0.5) / n) * 100 + '% - 8px)' }}
              >
                {b.label.length > 14 ? b.label.slice(0, 13) + '…' : b.label}
              </span>
            ) : null,
          )
        : null}
      {errorEdge ? (
        <Handle
          id="error"
          type="source"
          position={Position.Bottom}
          title="error — taken when this step fails"
          // Quiet until wanted: shown while the step is hovered or selected (an existing error
          // connection still shows as its red line). Nearly every pulse may fail, so a permanent
          // red dot under every tile was noise.
          className={cn(
            '!h-2.5 !w-2.5 !border-2 !border-background !bg-rose-500 transition-opacity',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        />
      ) : null}
    </>
  );
}

export function ConditionNode({ id, data, selected }: NodeProps) {
  const d = data as Record<string, any>;
  const entry = usePulseEntry(d) ?? { type: d.conditionType, kind: 'condition', dynamicBranches: 'cases' as const };
  const expr = [d.field, d.operator, d.value].filter((x) => x !== undefined && x !== '').join(' ');
  const outlets = outletsFor(entry, d.config);
  const title = d.label || (entry as { label?: string }).label || 'Condition';
  return (
    <NodeShell
      id={id}
      kind="condition"
      selected={selected}
      title={title}
      subtitle={expr || pulseSubtitle(title, entry as { label?: string })}
      runState={d.runState}
      runInfo={d.runInfo}
      pulseType={d.conditionType}
      icon={(entry as { icon?: string }).icon}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <SourceHandles outlets={outlets} errorEdge={hasErrorEdge(entry)} selected={selected} />
    </NodeShell>
  );
}

export function ActionNode({ id, data, selected }: NodeProps) {
  const d = data as Record<string, any>;
  const entry = usePulseEntry(d);
  const outlets = outletsFor(entry, d.config);
  const title = d.label || entry?.label || 'Action';
  return (
    <NodeShell
      id={id}
      kind="action"
      selected={selected}
      title={title}
      subtitle={pulseSubtitle(title, entry)}
      runState={d.runState}
      runInfo={d.runInfo}
      loop={isLoop(entry)}
      pulseType={d.actionType}
      icon={entry?.icon}
      quickAdd={outlets.length === 1 && outlets[0].id === undefined}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <SourceHandles outlets={outlets} errorEdge={hasErrorEdge(entry)} selected={selected} />
    </NodeShell>
  );
}

export function WaitNode({ id, data, selected }: NodeProps) {
  const d = data as Record<string, any>;
  const entry = usePulseEntry(d);
  const outlets = outletsFor(entry, d.config);
  const title = d.label || entry?.label || 'Wait';
  return (
    <NodeShell
      id={id}
      kind="wait"
      selected={selected}
      title={title}
      subtitle={pulseSubtitle(title, entry)}
      runState={d.runState}
      runInfo={d.runInfo}
      pulseType={d.waitType}
      icon={entry?.icon}
      quickAdd={outlets.length === 1 && outlets[0].id === undefined}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <SourceHandles outlets={outlets} errorEdge={hasErrorEdge(entry)} selected={selected} />
    </NodeShell>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  wait: WaitNode,
};
