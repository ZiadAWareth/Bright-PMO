import AppShell from "@/components/layout/AppShell";

/**
 * Layout for every signed-in screen.
 *
 * `(app)` is a route group — the parentheses keep it out of the URL, so
 * `app/(app)/projects/page.tsx` still serves `/projects`. Its only job is to
 * mount the shell once: App Router preserves `layout.tsx` across client-side
 * navigation, so the sidebar and navbar persist instead of being torn down and
 * rebuilt (and re-fetching the user) on every route change.
 *
 * Public screens — the landing page, the auth flow, the API docs — deliberately
 * sit outside this group so they render without the shell.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
