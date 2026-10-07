"use client";

import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { EmptyState } from "@/components/ui/entity-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessRoute } from "@/lib/route-access";

/**
 * Gates a screen on the signed-in user's role.
 *
 * Wraps `ProtectedRoute` (which only establishes *who* you are) and adds the
 * *what may you open* half. Roles come from `lib/route-access.ts`, the same
 * table the sidebar filters on, so a hidden nav entry and a blocked page can
 * never disagree.
 *
 * While the role is still resolving this renders nothing rather than the denial
 * screen: `useCurrentUser` answers from a module-scoped cache after the first
 * screen of a session, but on a cold load there is a brief window where the
 * role is unknown, and flashing "Unauthorized" at someone who does have access
 * is worse than a beat of blank space.
 *
 * This is a client-side guard over an already-authenticated session — it stops
 * the wrong role reaching a screen, and the API routes behind it enforce their
 * own permissions, which is what actually protects the data.
 */
export default function RoleGuard({
  route,
  title,
  children,
}: {
  /** Key into `ROUTE_ROLES`, e.g. "/scheduler". */
  route: string;
  /** Shown in the header of the denial screen so the shell still looks intact. */
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { userRole, roleLoading, isClient } = useCurrentUser();

  if (!isClient || roleLoading) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  if (!canAccessRoute(route, userRole)) {
    return (
      <ProtectedRoute>
        <DashboardLayout title={title}>
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
