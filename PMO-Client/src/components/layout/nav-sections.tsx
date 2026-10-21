import React from "react";
import {
    AlertTriangle,
    BarChart,
    BarChart3,
    Briefcase,
    CalendarClock,
    Clock,
    FileText,
    FolderOpen,
    Home,
    ShoppingCart,
    Users,
} from "lucide-react";

/** One entry in the sidebar. Every item shows: there are no roles until the backend integration. */
export interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
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
            },
            {
                label: "Reports",
                href: "/analytics/reports",
                icon: <FileText size={20} />,
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
            },
            {
                label: "Portfolios",
                href: "/portfolios",
                icon: <FolderOpen size={20} />,
            },
            {
                label: "Projects",
                href: "/projects",
                icon: <Briefcase size={20} />,
            },
            {
                label: "Resources",
                href: "/resources",
                icon: <Users size={20} />,
            },
            {
                label: "User Management",
                href: "/users",
                icon: <Users size={20} />,
            },
            {
                label: "Risk Management",
                href: "/risk",
                icon: <AlertTriangle size={20} />,
            },
            {
                label: "Scheduler",
                href: "/scheduler",
                icon: <CalendarClock size={20} />,
            },
            {
                label: "RFQ Management",
                href: "/rfq-management",
                icon: <ShoppingCart size={20} />,
            },
            {
                label: "Timesheet",
                href: "/timesheet",
                icon: <Clock size={20} />,
            },
        ],
    },
];
