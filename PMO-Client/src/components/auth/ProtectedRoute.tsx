"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Marks that an ancestor `ProtectedRoute` is already verifying the session.
 *
 * `RouteGuard` wraps every screen in the `(app)` group, and all 34 pages inside
 * that group still wrap themselves as well, from before the guard was hoisted
 * into the layout. Nested that way each instance ran its own `/api/auth/me`
 * call and rendered its own skeleton, so a cold load stacked two placeholder
 * pages and paid for two round trips. The inner instance now defers to the
 * outer one and simply renders its children, which makes the redundant wrappers
 * harmless and lets them be removed page by page rather than in one sweep.
 */
const VerifyingContext = createContext(false);

/**
 * Placeholder for the page body while the session is verified.
 *
 * This renders *inside* `AppShell`, which has already drawn the real sidebar,
 * the real navbar and the real logo — none of which depend on the answer from
 * `/api/auth/me`. An earlier version of this skeleton painted its own header,
 * its own 264px sidebar and its own content grid, so a cold load showed a
 * second, fake chrome nested inside the real one: a grey bar under the real
 * navbar and a grey column beside the real sidebar. Restricting the
 * placeholder to the content column removes that duplication, and the parts of
 * the shell that are known at build time now stay solid throughout the load.
 *
 * The role-dependent parts of the shell keep their own placeholders — the nav
 * list in `AppShell` genuinely cannot be drawn until the role is known.
 */
const ContentSkeleton = () => (
    <div className="p-6" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
            {/* Page header */}
            <div className="mb-6">
                <div className="mb-2 h-7 w-56 rounded bg-surface-3" />
                <div className="h-4 w-72 rounded bg-surface-3" />
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-lg border border-line bg-surface p-6 shadow-sm"
                    >
                        <div className="mb-2 flex items-center space-x-2">
                            <div className="h-6 w-3/4 rounded bg-surface-3" />
                            <div className="h-5 w-16 rounded-full bg-surface-3" />
                        </div>
                        <div className="mb-4 h-4 w-full rounded bg-surface-3" />
                        <div className="mb-2 h-2 w-full rounded bg-surface-3" />
                        <div className="h-2 w-3/4 rounded bg-surface-3" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const router = useRouter();
    const alreadyVerifying = useContext(VerifyingContext);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (alreadyVerifying) return;

        const verifyAuth = async () => {
            try {
                // Try to get token from localStorage (backward compatibility)
                const token = localStorage.getItem("token");
                
                // Verify authentication by calling /api/auth/me
                // This will work with both localStorage token AND cookies
                const response = await axios.get("/api/auth/me", {
                    // Include token in headers if available (backward compatibility)
                    ...(token && {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                });

                if (!response.data || !response.data.user) {
                    // If response is invalid, redirect to login
                    if (token) {
                        localStorage.removeItem("token");
                    }
                    router.push("/auth/login");
                    return;
                }

                // Authentication is valid, allow access
                setIsLoading(false);
            } catch (error) {
                console.error("Auth verification error:", error);
                // Handle any errors by redirecting to login
                const token = localStorage.getItem("token");
                if (token) {
                    localStorage.removeItem("token");
                }
                router.push("/auth/login");
            }
        };

        verifyAuth();
    }, [router, alreadyVerifying]);

    // An outer instance owns the check; rendering a second skeleton here would
    // only duplicate it.
    if (alreadyVerifying) {
        return <>{children}</>;
    }

    if (isLoading) {
        return <ContentSkeleton />;
    }

    return (
        <VerifyingContext.Provider value={true}>
            {children}
        </VerifyingContext.Provider>
    );
}
