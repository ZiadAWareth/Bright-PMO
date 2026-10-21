import { useMemo, useState } from 'react';
import { Zap, GitBranch, Bolt, Clock, Database, Users, Sparkles, X, Loader2, AlertTriangle, Search, CornerDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowCatalog, type CatalogPulse } from './useWorkflowCatalog';
import { PulseIcon } from './CustomNodes';

interface PaletteItem {
  kind: 'trigger' | 'condition' | 'action';
  /** The namespaced pulse type the engine executes, e.g. "data.updateRecord". */
  subType: string;
  label: string;
  description?: string;
  icon?: string;
}

interface PaletteSection {
  title: string;
  accent: string;
  icon: typeof Zap;
  items: PaletteItem[];
}

/**
 * The palette is built from the CATALOGUE, never from a static list.
 *
 * It used to hardcode the legacy vocabulary (onCreate, mutateData, sendEmail),
 * which the engine has no pulse for — so anything dragged from it produced a
 * workflow that could not run. Sourcing it from the same registry the engine
 * executes means the palette can only ever offer real components, and a newly
 * added pulse appears here automatically.
 */
const CATEGORY_ORDER = ['trigger', 'control', 'data', 'ai', 'integration', 'human', 'time', 'script'] as const;

const CATEGORY_META: Record<string, { title: string; accent: string; icon: typeof Zap }> = {
  trigger: { title: 'Triggers', accent: 'text-amber-600 dark:text-amber-400', icon: Zap },
  control: { title: 'Logic', accent: 'text-slate-600 dark:text-slate-300', icon: GitBranch },
  data: { title: 'Data', accent: 'text-sky-600 dark:text-sky-400', icon: Database },
  // Listed here rather than left to the fallback below. An unlisted category still renders — as
  // an untitled, muted section with a generic icon — so the backend half of this change would
  // look shipped while the palette quietly looked broken.
  ai: { title: 'Intelligence', accent: 'text-fuchsia-600 dark:text-fuchsia-400', icon: Sparkles },
  integration: { title: 'Integrations', accent: 'text-emerald-600 dark:text-emerald-400', icon: Bolt },
  human: { title: 'People', accent: 'text-violet-600 dark:text-violet-400', icon: Users },
  time: { title: 'Wait', accent: 'text-rose-600 dark:text-rose-400', icon: Clock },
  script: { title: 'Script', accent: 'text-teal-600 dark:text-teal-400', icon: Bolt },
};

function toSections(pulses: CatalogPulse[]): PaletteSection[] {
  const byCategory = new Map<string, PaletteItem[]>();
  for (const p of pulses) {
    const item: PaletteItem = {
      kind: p.kind,
      subType: p.type,
      label: p.label || p.type,
      icon: p.icon,
      description: p.description,
    };
    const list = byCategory.get(p.category) ?? [];
    list.push(item);
    byCategory.set(p.category, list);
  }

  const known = CATEGORY_ORDER.filter((c) => byCategory.has(c));
  const extra = [...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c as any)).sort();

  return [...known, ...extra].map((category) => {
    const meta = CATEGORY_META[category] ?? {
      title: category.charAt(0).toUpperCase() + category.slice(1),
      accent: 'text-muted-foreground',
      icon: Bolt,
    };
    return {
      title: meta.title,
      accent: meta.accent,
      icon: meta.icon,
      items: (byCategory.get(category) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
    };
  });
}

export default function NodePalette({
  onClose,
  addAfter,
  onCancelAddAfter,
  stage = 'steps',
}: {
  onClose?: () => void;
  /** Set when opened from a step's "+": clicking a component adds it after that step. */
  addAfter?: { sourceId: string; sourceLabel: string } | null;
  onCancelAddAfter?: () => void;
  /**
   * trigger — the flow has no trigger yet: ONLY triggers are offered, since nothing can run before
   *           one. Clicking one adds it (the canvas places it and opens its settings).
   * steps   — the flow starts with its trigger: everything but triggers (a flow has exactly one).
   */
  stage?: 'trigger' | 'steps';
}) {
  const { data: catalog, isLoading, isError, refetch } = useWorkflowCatalog();
  const [query, setQuery] = useState('');

  // A flow is a trigger first, then its steps: before the trigger only triggers are offered, and
  // after it none (a flow has exactly one, and a trigger can never come AFTER a step).
  const pickTrigger = stage === 'trigger' && !addAfter;
  const ALL_SECTIONS = useMemo(
    () => toSections((catalog?.pulses ?? []).filter((p) => (pickTrigger ? p.kind === 'trigger' : p.kind !== 'trigger'))),
    [catalog, pickTrigger],
  );
  const clickable = pickTrigger || !!addAfter;

  const addItem = (item: PaletteItem) => {
    if (pickTrigger) {
      window.dispatchEvent(new CustomEvent('pulse:add-trigger', { detail: { item } }));
      onClose?.();
      return;
    }
    if (!addAfter) return;
    window.dispatchEvent(new CustomEvent('pulse:add-after', { detail: { sourceId: addAfter.sourceId, item } }));
    onClose?.();
  };

  // Match on label, description and pulse type, so both "send email" and
  // "integration.sendEmail" find the same component. Empty sections are dropped
  // rather than left as bare headings.
  const SECTIONS = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_SECTIONS;
    return ALL_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((i: any) =>
        [i.label, i.description, i.subType].some((v: unknown) =>
          String(v ?? '').toLowerCase().includes(q),
        ),
      ),
    })).filter((section) => section.items.length > 0);
  }, [ALL_SECTIONS, query]);

  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {pickTrigger ? 'Choose a trigger' : addAfter ? 'Add the next step' : 'Components'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {pickTrigger ? 'What starts this workflow? Click one to add it' : addAfter ? 'Click a component to connect it' : 'Drag onto the canvas'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            title="Close components"
            aria-label="Close components"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {pickTrigger ? (
        <p className="border-b border-border bg-primary/5 px-4 py-2 text-[12px] text-foreground">
          Every workflow starts with one trigger. The other steps become available once it is on the canvas.
        </p>
      ) : null}
      {addAfter ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2 text-[12px]">
          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-foreground">
            After <span className="font-semibold">{addAfter.sourceLabel}</span>
          </span>
          <button type="button" onClick={onCancelAddAfter} className="shrink-0 font-medium text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      ) : null}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pickTrigger ? 'Search triggers…' : 'Search components…'}
            autoFocus={clickable}
            aria-label="Search components"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
      </div>
      <div className="soul-scroll flex-1 space-y-4 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center gap-2 px-1 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading components…
          </div>
        ) : null}
        {isError ? (
          <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> Could not load components.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
            >
              Retry
            </button>
          </div>
        ) : null}
        {!isLoading && !isError && SECTIONS.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">
            {query.trim() ? `No components match "${query.trim()}".` : 'No components available.'}
          </p>
        ) : null}
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title}>
              <div className="mb-1.5 flex items-center gap-1.5 px-1">
                <SectionIcon className={cn('h-3.5 w-3.5', section.accent)} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </span>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <div
                    key={item.subType}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    onClick={() => addItem(item)}
                    onKeyDown={(e) => {
                      if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        addItem(item);
                      }
                    }}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    title={item.description || item.label}
                    className={cn(
                      'group grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      clickable ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background">
                      <PulseIcon type={item.subType} icon={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-foreground">{item.label}</span>
                      {item.description ? (
                        <span className="block truncate text-[11.5px] text-muted-foreground">{item.description}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
