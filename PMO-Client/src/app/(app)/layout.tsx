import AppShell from "@/components/layout/AppShell";

/**
 * Layout for every in-app screen.
 *
 * `(app)` is a route group — the parentheses keep it out of the URL, so
 * `app/(app)/projects/page.tsx` still serves `/projects`. Its only job is to
 * mount the shell once: App Router preserves `layout.tsx` across client-side
 * navigation, so the sidebar and navbar persist instead of being torn down and
 * rebuilt on every route change.
 *
 * There is no sign-in gate: the client is a pure frontend until the new
 * backend integration (see AGENTS.md), so every screen is open.
 *
 * Public screens — the landing page and the auth screens — deliberately sit
 * outside this group so they render without the shell.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
