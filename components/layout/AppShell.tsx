"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    FolderOpen,
    Briefcase,
    BarChart3,
    Users,
    AlertTriangle,
    FileText,
    Moon,
    Sun,
    ChevronDown,
    Menu,
    X,
    User,
    LogOut,
    Bell,
    Trash2,
    Clock,
    Home,
    Database,
} from "lucide-react";
import NotificationModal from "../NotificationModal";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { clearCachedUser } from "@/lib/current-user-cache";
import { BRAND } from "@/lib/brand";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    allowedRoles?: string[];
}

interface NavSection {
    key: string;
    title: string;
    items: NavItem[];
}

/** Persisted set of collapsed sidebar group keys. */
const COLLAPSED_SECTIONS_KEY = "wujha-sidebar-collapsed-sections";

/**
 * Module-scoped mirror of the collapsed groups, so a remount never renders the
 * groups expanded for a frame before snapping them shut. The shell itself now
 * persists across navigation, but it still remounts when you cross between the
 * app shell and a public screen (sign-in, landing) and back.
 */
let collapsedSectionsCache: Set<string> | null = null;

function readCollapsedSections(): Set<string> {
    try {
        const raw = window.localStorage.getItem(COLLAPSED_SECTIONS_KEY);
        if (!raw) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((k): k is string => typeof k === "string"));
    } catch {
        // Corrupt or unavailable storage — fall back to everything expanded.
        return new Set();
    }
}

/**
 * The persistent application shell: floating sidebar, floating navbar and the
 * scrolling content region.
 *
 * Rendered once by `app/(app)/layout.tsx`. Because App Router preserves
 * `layout.tsx` across navigations, the sidebar and header are never torn down
 * when you move between screens — no remount, no refetch, no flash.
 *
 * The navbar shows the tenant and account controls only; each screen names
 * itself via the PageHeader card that `DashboardLayout` renders.
 */
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    // On the very first render of a session the cache is empty, so SSR and the
    // first client paint agree; after that a navigation remount reads the cache
    // and renders the correct groups immediately.
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
        () => collapsedSectionsCache ?? new Set()
    );
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    const { isDark, toggleTheme } = useTheme();
    const { fullName, nameAbbreviation, userRole, roleLoading, isClient } =
        useCurrentUser();
    const {
        notifications,
        notificationsOpen,
        setNotificationsOpen,
        loadingNotifications,
        unreadCount,
        selectedNotification,
        setSelectedNotification,
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        handleNotificationClick,
        handleNotificationDelete,
        handleNotificationDeleteFromDropdown,
        handleMarkAsRead,
    } = useNotifications(isClient);

    useOutsideClick(
        userMenuRef,
        useCallback(() => setUserMenuOpen(false), [])
    );
    useOutsideClick(
        notificationsRef,
        useCallback(() => setNotificationsOpen(false), [setNotificationsOpen]),
        notificationsOpen
    );

    // Restore which sidebar groups the user had collapsed. Only does real work
    // on the first mount of a session; afterwards the cache already holds it.
    useEffect(() => {
        if (collapsedSectionsCache) return;
        const restored = readCollapsedSections();
        collapsedSectionsCache = restored;
        if (restored.size > 0) setCollapsedSections(restored);
    }, []);

    const toggleSection = (sectionKey: string) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionKey)) {
                next.delete(sectionKey);
            } else {
                next.add(sectionKey);
            }
            collapsedSectionsCache = next;
            try {
                window.localStorage.setItem(
                    COLLAPSED_SECTIONS_KEY,
                    JSON.stringify([...next])
                );
            } catch {
                // Private-mode storage failure — the group still toggles.
            }
            return next;
        });
    };

    // Analytics leads the sidebar: the dashboard and reports both live under
    // /analytics, so the group mirrors the route tree rather than inventing a
    // grouping that only exists in the nav.
    const navSections: NavSection[] = [
        {
            key: "analytics",
            title: "Analytics",
            items: [
                {
                    label: "Dashboard",
                    href: "/analytics/dashboard",
                    icon: <Home size={20} />,
                    allowedRoles: [
                        "PMO",
                        "PJM",
                        "ADMIN",
                        "FIN",
                        "QAQC",
                        "IT",
                        "DIR",
                        "HR",
                        "LEGAL",
                    ],
                },
                {
                    label: "Reporting Engine",
                    href: "/analytics/reporting-engine",
                    icon: <Database size={20} />,
                    allowedRoles: [
                        "PJM",
                        "PMO",
                        "ADMIN",
                        "FIN",
                        "QAQC",
                        "IT",
                        "DIR",
                    ],
                },
                {
                    label: "Reports",
                    href: "/analytics/reports",
                    icon: <FileText size={20} />,
                    allowedRoles: [
                        "PJM",
                        "PMO",
                        "ADMIN",
                        "FIN",
                        "QAQC",
                        "IT",
                        "DIR",
                    ],
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
                    allowedRoles: ["PJM", "PMO", "ADMIN", "FIN", "DIR"],
                },
                {
                    label: "Portfolios",
                    href: "/portfolios",
                    icon: <FolderOpen size={20} />,
                    allowedRoles: ["PMO", "PJM", "ADMIN", "IT", "DIR"],
                },
                {
                    label: "Projects",
                    href: "/projects",
                    icon: <Briefcase size={20} />,
                    allowedRoles: ["PJM", "PMO", "ADMIN", "QAQC", "DIR"],
                },
                {
                    label: "Resources",
                    href: "/resources",
                    icon: <Users size={20} />,
                    allowedRoles: ["PJM", "PMO", "ADMIN", "DIR", "HR"],
                },
                {
                    label: "User Management",
                    href: "/users",
                    icon: <Users size={20} />,
                    allowedRoles: ["PMO", "ADMIN", "HR", "DIR"],
                },
                {
                    label: "Risk Management",
                    href: "/risk",
                    icon: <AlertTriangle size={20} />,
                    allowedRoles: ["PJM", "PMO", "ADMIN", "DIR"],
                },
            ],
        },
    ];

    // Matches child routes too, so "Projects" stays lit on /projects/12/gantt.
    const isActiveRoute = (href: string) =>
        pathname === href || Boolean(pathname?.startsWith(`${href}/`));

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });
            localStorage.removeItem('token');
            // Drop the cached identity so the next sign-in re-fetches it.
            clearCachedUser();
            const useIdp =
                typeof process !== "undefined" &&
                process.env.NEXT_PUBLIC_USE_IDP_AUTH === "true";
            const idpLogoutUrl =
                typeof process !== "undefined"
                    ? process.env.NEXT_PUBLIC_IDP_LOGOUT_URL
                    : undefined;

            if (useIdp) {
                const afterLogout =
                    typeof window !== "undefined"
                        ? `${window.location.origin}/api/auth/idp/start?returnTo=${encodeURIComponent("/dashboard")}`
                        : "";
                if (idpLogoutUrl && typeof window !== "undefined") {
                    const url = new URL(idpLogoutUrl, window.location.origin);
                    if (!url.searchParams.has("post_logout_redirect_uri")) {
                        url.searchParams.set(
                            "post_logout_redirect_uri",
                            afterLogout
                        );
                    }
                    window.location.assign(url.toString());
                } else if (typeof window !== "undefined") {
                    window.location.assign(afterLogout);
                }
            } else {
                router.push('/auth/login');
            }
        } catch (error) {
            console.error("Logout failed:", error);
            window.location.href = "/auth/login";
        }
    };

    const hasAccessToNavItem = (item: NavItem): boolean => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) {
            return true;
        }
        if (!userRole) {
            return false;
        }
        return item.allowedRoles.some(
            (allowedRole) =>
                allowedRole.toLowerCase() === userRole.toLowerCase()
        );
    };

    const renderNavSection = (section: NavSection) => {
        const sectionItems = section.items.filter(hasAccessToNavItem);
        if (sectionItems.length === 0) {
            return null;
        }

        // A group holding the current route always renders open — collapsing the
        // section you are standing in would hide where you are.
        const hasActiveItem = sectionItems.some((item) =>
            isActiveRoute(item.href)
        );
        const isCollapsed = collapsedSections.has(section.key) && !hasActiveItem;
        const panelId = `nav-section-${section.key}`;

        return (
            <div className="mb-3 px-3" key={section.key}>
                <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={!isCollapsed}
                    aria-controls={panelId}
                    className="group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wujha-primary/60"
                >
                    <span className="truncate">{section.title}</span>
                    <ChevronDown
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 text-text-secondary/70 transition-transform duration-200 ease-out group-hover:text-text-primary ${
                            isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                    />
                </button>

                <div
                    id={panelId}
                    aria-hidden={isCollapsed}
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        isCollapsed
                            ? "grid-rows-[0fr] opacity-0"
                            : "mt-1 grid-rows-[1fr] opacity-100"
                    }`}
                >
                    <div className="overflow-hidden">
                        <div className="space-y-0.5">
                            {sectionItems.map((item) => (
                                <button
                                    key={item.href}
                                    onClick={() => {
                                        router.push(item.href);
                                        setSidebarOpen(false);
                                    }}
                                    tabIndex={isCollapsed ? -1 : undefined}
                                    aria-current={
                                        isActiveRoute(item.href)
                                            ? "page"
                                            : undefined
                                    }
                                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-wujha-primary/60 ${
                                        isActiveRoute(item.href)
                                            ? "bg-wujha-primary/10 font-semibold text-wujha-primary"
                                            : "font-medium text-text-primary/85 hover:bg-bg-surface-alt hover:text-wujha-primary"
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                                            isActiveRoute(item.href)
                                                ? "text-wujha-primary"
                                                : "text-text-secondary group-hover:text-wujha-primary"
                                        }`}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className="flex-1 truncate text-left">
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen">
            {/* Floating shell: the sidebar and header are detached, rounded cards
                resting on the app background, with the page content scrolling
                independently beneath the header. */}
            <div className="flex h-screen overflow-hidden bg-bg-light text-text-primary">
                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Floating sidebar — an overlay drawer below `lg`, an in-flow
                    card from `lg` up. */}
                <nav
                    aria-label="Primary"
                    className={`
          fixed inset-y-3 left-3 z-50 flex w-[272px] shrink-0 flex-col overflow-hidden
          rounded-3xl border border-border bg-bg-sidebar shadow-xl shadow-black/10
          transition-transform duration-300 ease-in-out
          sm:inset-y-4 sm:left-4
          lg:relative lg:inset-auto lg:my-4 lg:ml-4 lg:translate-x-0 lg:self-stretch lg:shadow-lg lg:shadow-black/5
          ${sidebarOpen ? "translate-x-0" : "-translate-x-[120%]"}
        `}
                >
                    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4">
                        <button
                            onClick={() => router.push("/")}
                            className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-wujha-primary/60"
                        >
                            <span
                                aria-hidden="true"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-wujha-primary to-wujha-primary-hover text-base font-bold text-white shadow-md shadow-wujha-primary/25"
                            >
                                W
                            </span>
                            <span className="truncate text-base font-bold tracking-tight text-text-primary">
                                WUJHA PMO
                            </span>
                        </button>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Close navigation"
                            className="rounded-xl p-1.5 text-text-secondary transition-colors hover:bg-bg-surface-alt hover:text-text-primary lg:hidden"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3">
                        {roleLoading ? (
                            <div className="px-5 py-4">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                                    Loading...
                                </div>
                                <div className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-text-secondary">
                                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-wujha-primary"></div>
                                    <span>Loading navigation...</span>
                                </div>
                            </div>
                        ) : (
                            <>{navSections.map(renderNavSection)}</>
                        )}
                    </div>
                </nav>

                {/* Main Content */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    {/* Floating navbar */}
                    <div className="z-30 shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
                    <header className="flex h-16 w-full items-center rounded-3xl border border-border bg-bg-surface/95 px-4 shadow-lg shadow-black/5 backdrop-blur-md supports-[backdrop-filter]:bg-bg-surface/80 sm:px-6">
                        <div className="flex w-full min-w-0 items-center justify-between gap-3">
                            {/* The navbar identifies the tenant, not the page —
                                it is identical on every screen. Each screen names
                                itself in its own PageHeader card. */}
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    aria-label="Open navigation"
                                    className="shrink-0 rounded-xl p-2 text-text-secondary transition-colors hover:bg-bg-surface-alt hover:text-text-primary lg:hidden"
                                >
                                    <Menu size={20} />
                                </button>

                                <span
                                    aria-hidden="true"
                                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-wujha-primary to-wujha-primary-hover text-[15px] font-bold text-white shadow-sm shadow-wujha-primary/25"
                                >
                                    {BRAND.monogram}
                                </span>
                                <div className="flex min-w-0 flex-col">
                                    <p className="truncate text-[15px] font-semibold leading-tight text-text-primary">
                                        {BRAND.companyName}
                                    </p>
                                    <p className="truncate text-[11.5px] leading-tight text-text-secondary">
                                        {BRAND.suiteName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                                {/* Notifications Button */}
                                <div
                                    className="relative"
                                    ref={notificationsRef}
                                >
                                    <button
                                        onClick={() =>
                                            setNotificationsOpen(
                                                (open: boolean) => !open
                                            )
                                        }
                                        aria-label="Notifications"
                                        className="relative rounded-xl border border-transparent p-2 text-text-secondary transition-colors hover:border-border hover:text-text-primary"
                                    >
                                        <Bell size={18} />
                                        {unreadCount > 0 && (
                                            <span className="notification-badge absolute -right-1 -top-1 rounded-full bg-wujha-danger px-1 text-xs text-white">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {notificationsOpen && (
                                        <div className="absolute right-0 z-50 mt-2 max-h-[320px] w-96 overflow-y-auto rounded-2xl border border-border bg-bg-surface shadow-xl">
                                            <div className="border-b border-border px-4 py-2.5 font-semibold text-text-primary">
                                                Notifications
                                            </div>
                                            {loadingNotifications ? (
                                                <div className="p-4 text-center text-text-secondary">
                                                    Loading...
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-4 text-center text-text-secondary">
                                                    No notifications
                                                </div>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.notification_id}
                                                        className={`flex cursor-pointer items-start gap-2 border-b border-border px-4 py-3 transition-colors hover:bg-bg-surface-alt ${
                                                            n.status ===
                                                            "UNREAD"
                                                                ? "bg-wujha-primary/5"
                                                                : ""
                                                        }`}
                                                        style={{
                                                            minHeight: "72px",
                                                        }}
                                                        onClick={() =>
                                                            handleNotificationClick(
                                                                n
                                                            )
                                                        }
                                                    >
                                                        <div className="flex flex-1 flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-text-primary">
                                                                    {n.title}
                                                                </span>
                                                                {n.status ===
                                                                    "UNREAD" && (
                                                                    <span className="ml-1 inline-block h-2 w-2 animate-pulse-soft rounded-full bg-wujha-primary" />
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-text-secondary">
                                                                {n.message}
                                                            </span>
                                                            <span className="mt-1 text-xs text-text-secondary/70">
                                                                {new Date(
                                                                    n.created_at
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={(e) =>
                                                                handleNotificationDeleteFromDropdown(
                                                                    e,
                                                                    n.notification_id
                                                                )
                                                            }
                                                            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-wujha-danger/10 hover:text-wujha-danger"
                                                            title="Delete notification"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Dark mode switch button */}
                                <button
                                    onClick={toggleTheme}
                                    aria-label={
                                        isDark
                                            ? "Switch to light mode"
                                            : "Switch to dark mode"
                                    }
                                    className="rounded-xl border border-transparent p-2 text-text-secondary transition-colors hover:border-border hover:text-text-primary"
                                >
                                    {isDark ? (
                                        <Sun size={18} />
                                    ) : (
                                        <Moon size={18} />
                                    )}
                                </button>

                                <div
                                    className="mx-1.5 h-6 w-px bg-border"
                                    aria-hidden="true"
                                />

                                <div className="relative" ref={userMenuRef}>
                                    <div
                                        onClick={() =>
                                            setUserMenuOpen(!userMenuOpen)
                                        }
                                        className="flex cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-bg-surface-alt"
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-wujha-primary to-wujha-primary-hover text-sm font-semibold text-white">
                                            {isClient ? nameAbbreviation : "U"}
                                        </div>
                                        <span className="hidden font-medium text-text-primary sm:block">
                                            {isClient ? fullName : "User"}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-text-secondary transition-transform ${
                                                userMenuOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </div>

                                    {userMenuOpen && (
                                        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-xl">
                                            <div className="p-1.5">
                                                <button
                                                    onClick={() => {
                                                        router.push("/profile");
                                                        setUserMenuOpen(false);
                                                    }}
                                                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-surface-alt hover:text-wujha-primary"
                                                >
                                                    <User
                                                        size={16}
                                                        className="mr-2"
                                                    />
                                                    <span>Profile</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        router.push(
                                                            "/timesheet"
                                                        );
                                                        setUserMenuOpen(false);
                                                    }}
                                                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-surface-alt hover:text-wujha-primary"
                                                >
                                                    <Clock
                                                        size={16}
                                                        className="mr-2"
                                                    />
                                                    <span>My Timesheet</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleLogout();
                                                        setUserMenuOpen(false);
                                                    }}
                                                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-surface-alt hover:text-wujha-danger"
                                                >
                                                    <LogOut
                                                        size={16}
                                                        className="mr-2"
                                                    />
                                                    <span>Logout</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>
                    </div>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
                        {children}
                    </main>
                </div>
            </div>

            {/* Notification Modal */}
            <NotificationModal
                notification={selectedNotification}
                isOpen={isNotificationModalOpen}
                onClose={() => {
                    setIsNotificationModalOpen(false);
                    setSelectedNotification(null);
                }}
                onDelete={handleNotificationDelete}
                onMarkAsRead={handleMarkAsRead}
            />
        </div>
    );
};

export default AppShell;
