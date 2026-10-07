import React from "react";
import {
    AlertTriangle,
    BarChart,
    BarChart3,
    Briefcase,
    CalendarClock,
    Clock,
    Database,
    FileText,
    FolderOpen,
    Home,
    ShoppingCart,
    Users,
} from "lucide-react";
import { ROUTE_ROLES } from "@/lib/route-access";

/**
 * One entry in the sidebar.
 *
 * `allowedRoles` is an allow-list: an item with no roles is visible to every
 * signed-in user, and an item that names roles is hidden from everyone else.
 * Hiding is a navigation convenience only — `RouteGuard` and the API
 * middleware are what actually enforce access.
 */
export interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    allowedRoles?: string[];
}

/** A titled, collapsible group of nav items. */
export interface NavSection {
    key: string;
    title: string;
    items: NavItem[];
}

/**
 * The sidebar's contents.
 *
 * Kept as data in its own module rather than inline in `AppShell`: adding a
 * screen to the nav is then a one-entry edit to a list, with no risk of
 * disturbing the shell's layout or state logic, and the shell file stays about
 * rendering rather than about which screens exist.
 */
export const NAV_SECTIONS: NavSection[] = [
    {
        key: "analytics",
        title: "Analytics",
        items: [
            {
                label: "Dashboard",
                href: "/analytics/dashboard",
                icon: <Home size={20} />,
                allowedRoles: ROUTE_ROLES["/analytics/dashboard"],
            },
            {
                label: "Reporting Engine",
                href: "/analytics/reporting-engine",
                icon: <Database size={20} />,
                allowedRoles: ROUTE_ROLES["/analytics/reporting-engine"],
            },
            {
                label: "Reports",
                href: "/analytics/reports",
                icon: <FileText size={20} />,
                allowedRoles: ROUTE_ROLES["/analytics/reports"],
            },
        ],
    },
    {
        key: "main",
        title: "Main",
        items: [
            {
                label: "EPS Management",
                href: "/eps",
                icon: <BarChart3 size={20} />,
                allowedRoles: ROUTE_ROLES["/eps"],
            },
            {
                label: "Portfolios",
                href: "/portfolios",
                icon: <FolderOpen size={20} />,
                allowedRoles: ROUTE_ROLES["/portfolios"],
            },
            {
                label: "Projects",
                href: "/projects",
                icon: <Briefcase size={20} />,
                allowedRoles: ROUTE_ROLES["/projects"],
            },
            {
                label: "Resources",
                href: "/resources",
                icon: <Users size={20} />,
                allowedRoles: ROUTE_ROLES["/resources"],
            },
            {
                label: "User Management",
                href: "/users",
                icon: <Users size={20} />,
                allowedRoles: ROUTE_ROLES["/users"],
            },
            {
                label: "Risk Management",
                href: "/risk",
                icon: <AlertTriangle size={20} />,
                allowedRoles: ROUTE_ROLES["/risk"],
            },
            {
                label: "Scheduler",
                href: "/scheduler",
                icon: <CalendarClock size={20} />,
                allowedRoles: ROUTE_ROLES["/scheduler"],
            },
            {
                label: "RFQ Management",
                href: "/rfq-management",
                icon: <ShoppingCart size={20} />,
                allowedRoles: ROUTE_ROLES["/rfq-management"],
            },
            {
                // Everyone logs their own hours, so this carries no role
                // restriction; the page hides the all-team tab by itself.
                label: "Timesheet",
                href: "/timesheet",
                icon: <Clock size={20} />,
            },
        ],
    },
];
