"use client";

import { usePathname, useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { EmptyState } from "@/components/ui/entity-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  ROUTE_TITLES,
  canAccessRoute,
  matchRoute,
} from "@/lib/route-access";

/**
 * Blanket role gate for every screen inside the `(app)` route group.
 *
 * `RoleGuard` gates one screen and has to be added by hand at each call site,
 * which is exactly how twenty pages — every `/projects/[id]/*` subpage, the
 * risk and resource detail screens, the user drilldown — ended up with no guard
 * at all: they were simply never wrapped. Mounting this once in the layout
 * inverts that default, so a route is protected unless `ROUTE_ROLES`
 * deliberately leaves it open, and a page added tomorrow inherits the rule
 * without anyone remembering to wrap it.
 *
 * The rule is resolved from the pathname by longest prefix, so child routes
 * inherit their parent's permissions (`/projects/12/budget` is governed by
 * `/projects`) while a more specific entry still wins where one exists.
 *
 * While the role resolves this renders the `ProtectedRoute` skeleton rather
 * than the denial screen: `useCurrentUser` answers from a module-scoped cache
 * after the first screen of a session, but on a cold load there is a window
 * where the role is unknown, and flashing "Unauthorized" at someone who does
 * have access is worse than a beat of skeleton.
 *
 * This is a client guard over an already-authenticated session — it stops the
 * wrong role reaching a screen. The API routes behind it enforce their own
 * permissions in `middleware.ts`, and that is what actually protects the data.
 */
export default function RouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, roleLoading, isClient } = useCurrentUser();

  const route = matchRoute(pathname ?? "");

  // No rule for this path — any signed-in user may open it. Deliberate for
  // personal screens such as `/profile` and `/timesheet`, where the in-page
  // checks handle the narrower "see everyone's data" case.
  if (!route) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  if (!isClient || roleLoading) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  if (!canAccessRoute(route, userRole)) {
    return (
      <ProtectedRoute>
        <DashboardLayout title={ROUTE_TITLES[route] ?? "Unauthorized"}>
          <EmptyState
            icon={<ShieldOff className="h-10 w-10" />}
            title="401 — Unauthorized"
            message={
              <>
                Your role
                {userRole ? (
                  <>
                    {" "}
                    (<span className="font-semibold">{userRole}</span>)
                  </>
                ) : null}{" "}
                does not have access to this page. If you believe this is a
                mistake, contact your administrator.
              </>
            }
            action={
              <button
                type="button"
                onClick={() => router.push("/analytics/dashboard")}
                className="text-[13px] font-semibold text-bright hover:text-bright-deep"
              >
                Back to dashboard
              </button>
            }
          />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
