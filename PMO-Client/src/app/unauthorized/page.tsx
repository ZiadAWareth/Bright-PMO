import Link from "next/link";
import { ShieldOff } from "lucide-react";

/**
 * The 401 screen for page routes gated in `middleware.ts`.
 *
 * Screens inside the `(app)` group show their denial through `RouteGuard`, so
 * the sidebar stays mounted and the user keeps their bearings. The routes gated
 * in middleware — `/admin`, `/api-docs`, `/report-generator` — render outside
 * the shell, and `/admin/[entity]` is a server component whose data fetch has to
 * be stopped before render. Middleware rewrites to this page instead, which
 * keeps the URL the user typed while serving a readable answer.
 */
export default async function UnauthorizedPage({
  searchParams,
}: {
  // Next 15 hands page props in as promises.
  searchParams?: Promise<{ from?: string }>;
}) {
  const from = (await searchParams)?.from;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldOff className="h-7 w-7" />
        </div>

        <h1 className="text-lg font-semibold text-ink">401 — Unauthorized</h1>

        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Your role does not have access to
          {from ? (
            <>
              {" "}
              <span className="font-medium text-ink">{from}</span>
            </>
          ) : (
            " this page"
          )}
          . If you believe this is a mistake, contact your administrator.
        </p>

        <Link
          href="/analytics/dashboard"
          className="mt-6 inline-block text-[13px] font-semibold text-bright hover:text-bright-deep"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
