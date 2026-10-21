import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { AskDock, AskProvider } from '@/components/agent/ask-panel';

/** Tailwind's md breakpoint: from here up the sidebar rail is shown and the drawer is not needed. */
const DESKTOP_QUERY = '(min-width: 768px)';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  // The workflow modeler is an immersive, full-bleed canvas.
  const isModeler = pathname.startsWith('/automation/workflows/');
  // Pages that fill the content area edge to edge and manage their own scroll and padding:
  // the modeler, and the UI Builder landing page (a full-area hero, not a card in a padded column).
  const fullBleed = isModeler || pathname === '/design-frontend';

  // Auto-collapse the rail when entering the modeler for maximum canvas space.
  useEffect(() => {
    if (isModeler) setCollapsed(true);
  }, [isModeler]);

  // Picking a page in the drawer takes you there and gets the drawer out of the way.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Rotating a tablet or widening the window past md shows the rail; a drawer left open on top of
  // it would be a second copy of the same navigation.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, []);

  return (
    // Floating shell: a soft backdrop with the sidebar, topbar and content
    // rendered as detached rounded cards (mirrors the Soul schema builder).
    // h-dvh, not h-screen: on phones 100vh includes the browser's own toolbars, which would push
    // the bottom of every page under them.
    // AskProvider: the Ask button (top bar), Ctrl/⌘ K and the Ask panel share one open state.
    <AskProvider>
    <div className="flex h-screen gap-3 overflow-hidden bg-muted/40 p-2 text-foreground supports-[height:100dvh]:h-dvh dark:bg-background sm:p-3">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Phones and small tablets: the same navigation, as a slide-in drawer. */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] p-2 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left motion-reduce:animate-none md:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <Sidebar
              variant="drawer"
              collapsed={false}
              setCollapsed={() => undefined}
              onClose={() => setMenuOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        {/* relative on BOTH: Radix form controls (checkbox, switch, select) render a hidden
            position:absolute <input> beside themselves. With no positioned ancestor those inputs are
            placed against the document and stretch it, so a long form (the role screen) got a second,
            page-level scrollbar beside this one. Anchoring them here keeps them inside the scroller. */}
        {/* The page, and Ask docked beside it on wide screens (it slides over on narrow ones). */}
        <div className="flex min-h-0 flex-1 gap-2 overflow-hidden sm:gap-3">
        <main className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="relative h-full overflow-auto overscroll-contain">
              <div className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6">
                <Outlet />
              </div>
            </div>
          )}
        </main>
        <AskDock />
        </div>
      </div>
    </div>
    </AskProvider>
  );
}
