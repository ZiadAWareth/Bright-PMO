import AppShell from "@/components/layout/AppShell";
import RouteGuard from "@/components/auth/RouteGuard";

/**
 * Layout for every signed-in screen.
 *
 * `(app)` is a route group — the parentheses keep it out of the URL, so
 * `app/(app)/projects/page.tsx` still serves `/projects`. Its only job is to
 * mount the shell once: App Router preserves `layout.tsx` across client-side
 * navigation, so the sidebar and navbar persist instead of being torn down and
 * rebuilt (and re-fetching the user) on every route change.
 *
 * It also mounts `RouteGuard`, which authenticates the session and enforces
 * the role rules in `lib/route-access.ts` for every screen underneath.
 * Putting the gate here rather than at each page makes protection the default:
 * a new screen is covered the moment it is added, instead of relying on whoever
 * writes it to remember a wrapper.
 *
 * Public screens — the landing page, the auth flow, the API docs — deliberately
 * sit outside this group so they render without the shell.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <RouteGuard>{children}</RouteGuard>
    </AppShell>
  );
}
