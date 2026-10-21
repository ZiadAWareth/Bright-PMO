import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Sparkles } from 'lucide-react';
import { useFeature } from '@/lib/features';
import { RECORD_ROUTES } from '@/lib/record-routes';
import { cn } from '@/lib/utils';
import { AssistantChat, type AskContext } from '@/components/agent/assistant-chat';

/**
 * Ask — the data assistant, one click (or Ctrl/⌘ K) away on every page.
 *
 * Wide screens: a panel docked beside the page, so the page stays in view and usable.
 * Narrow screens: the same panel slides over the page.
 * It reads and answers within the person's own permissions; it never changes a record. The
 * workflow editor has its own, different AI ("Build with AI"), which designs workflows.
 */

/** lg: from here up the panel docks beside the page instead of covering it. */
const DOCK_QUERY = '(min-width: 1024px)';

interface AskState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  allowed: boolean;
}
const AskCtx = createContext<AskState>({ open: false, setOpen: () => undefined, toggle: () => undefined, allowed: false });

export const useAsk = () => useContext(AskCtx);

export function AskProvider({ children }: { children: ReactNode }) {
  // The same switch as the Assistant page: no switch, no button, no shortcut, no panel.
  const allowed = useFeature('assistant');
  const [open, setOpenState] = useState(false);
  const setOpen = useCallback((v: boolean) => setOpenState(allowed && v), [allowed]);
  const toggle = useCallback(() => setOpenState((v) => allowed && !v), [allowed]);

  // Ctrl/⌘ K anywhere opens (or closes) it.
  useEffect(() => {
    if (!allowed) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenState((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowed]);

  const value = useMemo(() => ({ open, setOpen, toggle, allowed }), [open, setOpen, toggle, allowed]);
  return <AskCtx.Provider value={value}>{children}</AskCtx.Provider>;
}

/** The top bar's Ask button. */
export function AskButton() {
  const { open, toggle, allowed } = useAsk();
  if (!allowed) return null;
  const mac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={open}
      aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}
      title={'Ask about your data (' + (mac ? '⌘' : 'Ctrl') + ' K)'}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        open
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-primary/30 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10',
      )}
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      <span>Ask</span>
      <kbd className={cn('ml-0.5 hidden rounded border px-1 font-sans text-[10px] lg:inline', open ? 'border-primary-foreground/40' : 'border-primary/30')}>
        {mac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

/**
 * Where the person is, from the address: a record page ("KitchenSink #5"), or the page's own
 * heading. Re-read for every question, so it follows them as they move around.
 */
function usePageContext(): () => AskContext | null {
  const { pathname } = useLocation();
  return useCallback(() => {
    const heading = (document.querySelector('main h1')?.textContent || '').trim();
    for (const [entity, base] of Object.entries(RECORD_ROUTES)) {
      if (!pathname.toLowerCase().startsWith(base.toLowerCase() + '/')) continue;
      const id = decodeURIComponent(pathname.slice(base.length + 1).split('/')[0] || '');
      if (!id || id === 'new') break;
      const name = heading && heading.length < 60 ? heading : entity;
      return {
        // "Kitchen Sink #31" when the heading already says which one; else add the id.
        label: name.includes(id) ? name : `${name} #${id}`,
        prompt:
          `The user is looking at one record: the ${entity} with id ${id} (page "${heading || pathname}"). ` +
          'When they say "this", "here" or "this record", they mean that record — look it up rather than asking which one.',
      };
    }
    if (!heading) return null;
    return {
      label: heading,
      prompt: `The user is on the "${heading}" page (${pathname}). When they say "this" or "here", they mean what that page shows.`,
    };
  }, [pathname]);
}

/** The panel: docked beside the page on wide screens, sliding over it on narrow ones. */
export function AskDock() {
  const { open, setOpen, allowed } = useAsk();
  const context = usePageContext();
  const [docked, setDocked] = useState(() => typeof window !== 'undefined' && window.matchMedia(DOCK_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DOCK_QUERY);
    const onChange = () => setDocked(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  // Esc closes the docked panel too (the slide-over gets it from the dialog).
  useEffect(() => {
    if (!open || !docked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, docked, setOpen]);

  if (!allowed) return null;
  const chat = <AssistantChat variant="panel" context={context} onClose={() => setOpen(false)} />;

  if (docked) {
    return open ? (
      <aside
        aria-label="Ask about your data"
        className="flex w-[400px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none xl:w-[440px]"
      >
        {chat}
      </aside>
    ) : null;
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] p-2 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">Ask about your data</DialogPrimitive.Title>
          <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">{chat}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
