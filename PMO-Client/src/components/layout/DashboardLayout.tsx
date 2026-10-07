"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
    AlertTriangle,
    BarChart3,
    Briefcase,
    CalendarRange,
    Clock,
    Database,
    FileText,
    FolderOpen,
    Home,
    LayoutDashboard,
    User,
    Users,
    type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/form-shell";

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    /** Sits under the title. */
    subtitle?: React.ReactNode;
    /** Overrides the icon derived from the route. */
    icon?: LucideIcon;
    /** Buttons for the right of the header, e.g. a "New …" CTA. */
    actions?: React.ReactNode;
    /** Renders a back link above the title. Detail screens set this. */
    backHref?: string;
    /** Text for the back link, e.g. "Back to Projects". */
    backLabel?: string;
    /** Strip below the title row — counts, status pills. */
    meta?: React.ReactNode;
    /** Opt out entirely, for screens that build their own heading. */
    hideHeader?: boolean;
    /**
     * Accepted for backwards compatibility only. The shell never read these —
     * screens keep their own `activeView` state for their own role logic and
     * passed it down out of habit.
     */
    onViewChange?: (view: string) => void;
    activeView?: string;
}

/**
 * Route → header icon. Longest prefix wins, so `/analytics/reports` picks the
 * report icon rather than the analytics one.
 *
 * Deriving from the route means every screen gets a sensible icon without
 * forty separate edits; a screen that wants something else passes `icon`.
 */
const ROUTE_ICONS: [string, LucideIcon][] = [
    ["/analytics/dashboard", LayoutDashboard],
    ["/analytics/reporting-engine", Database],
    ["/analytics/reports", FileText],
    ["/analytics", BarChart3],
    ["/eps", BarChart3],
    ["/portfolios", FolderOpen],
    ["/projects", Briefcase],
    ["/resources", Users],
    ["/users", Users],
    ["/risk", AlertTriangle],
    ["/timesheet", Clock],
    ["/scheduler", CalendarRange],
    ["/rfq-management", FileText],
    ["/profile", User],
    ["/dynamic-dashboard", LayoutDashboard],
];

function iconForPath(pathname: string | null): LucideIcon {
    if (!pathname) return Home;
    const match = ROUTE_ICONS.filter(([prefix]) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`),
    ).sort((a, b) => b[0].length - a[0].length)[0];
    return match?.[1] ?? Home;
}

/**
 * Screen wrapper: renders the page header card, then the screen's content.
 *
 * The sidebar and navbar live in `AppShell`, mounted once by
 * `app/(app)/layout.tsx`, so they are never rebuilt on navigation. The navbar
 * shows the tenant; naming the page is this component's job — which is why the
 * `title` every screen already passes now feeds a header card instead of a
 * navbar heading.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    title,
    subtitle,
    icon,
    actions,
    backHref,
    backLabel,
    meta,
    hideHeader,
}) => {
    const pathname = usePathname();
    const showHeader = Boolean(title) && !hideHeader;

    return (
        <>
            {showHeader && (
                <div className="mb-5">
                    <PageHeader
                        icon={icon ?? iconForPath(pathname)}
                        title={title!}
                        subtitle={subtitle}
                        backHref={backHref}
                        backLabel={backLabel}
                        actions={actions}
                        meta={meta}
                    />
                </div>
            )}
            {children}
        </>
    );
};

export default DashboardLayout;
