"use client";

import React, { useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import NotificationModal from "../NotificationModal";
import { useTheme } from "@/hooks/useTheme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useOutsideClick } from "@/hooks/useOutsideClick";

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    onViewChange?: (view: string) => void;
    activeView?: string;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    section: string;
    allowedRoles?: string[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    title = "Dashboard",
    onViewChange,
    activeView: externalActiveView,
}) => {
    const [internalActiveView, setInternalActiveView] = useState("admin");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
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

    const activeView = externalActiveView || internalActiveView;

    const navItems: NavItem[] = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: <Home size={20} />,
            section: "main",
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
            label: "EPS Management",
            href: "/eps",
            icon: <BarChart3 size={20} />,
            section: "main",
            allowedRoles: ["PJM", "PMO", "ADMIN", "FIN", "DIR"],
        },
        {
            label: "Portfolios",
            href: "/portfolios",
            icon: <FolderOpen size={20} />,
            section: "main",
            allowedRoles: ["PMO", "PJM", "ADMIN", "IT", "DIR"],
        },
        {
            label: "Projects",
            href: "/projects",
            icon: <Briefcase size={20} />,
            section: "main",
            allowedRoles: ["PJM", "PMO", "ADMIN", "QAQC", "DIR"],
        },
        {
            label: "Resources",
            href: "/resources",
            icon: <Users size={20} />,
            section: "main",
            allowedRoles: ["PJM", "PMO", "ADMIN", "DIR", "HR"],
        },
        {
            label: "User Management",
            href: "/users",
            icon: <Users size={20} />,
            section: "main",
            allowedRoles: ["PMO", "ADMIN", "HR", "DIR"],
        },
        {
            label: "Risk Management",
            href: "/risk",
            icon: <AlertTriangle size={20} />,
            section: "resources-finance",
            allowedRoles: ["PJM", "PMO", "ADMIN"],
        },
        {
            label: "Reports",
            href: "/reports",
            icon: <FileText size={20} />,
            section: "reporting",
            allowedRoles: ["PJM", "PMO", "ADMIN", "FIN", "QAQC", "IT", "DIR"],
        },
        {
            label: "Risk Management",
            href: "/risk",
            icon: <AlertTriangle size={20} />,
            section: "main",
            allowedRoles: ["PJM", "PMO", "ADMIN", "DIR"],
        },
        {
            label: "RFQ Management",
            href: "/rfq-management",
            icon: <FileText size={20} />,
            section: "procurement",
            allowedRoles: ["PROC", "PMO", "ADMIN", "DIR", "LEGAL"],
        },
    ];

    const isActiveRoute = (href: string) => pathname === href;

    const handleViewChange = (view: string) => {
        if (onViewChange) {
            onViewChange(view);
        } else {
            setInternalActiveView(view);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });
            localStorage.removeItem('token');
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

    const renderNavSection = (sectionKey: string, sectionTitle: string) => {
        const sectionItems = navItems
            .filter((item) => item.section === sectionKey)
            .filter((item) => hasAccessToNavItem(item));

        if (sectionItems.length === 0) {
            return null;
        }

        return (
            <div className="px-5 py-2 mt-4" key={sectionKey}>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {sectionTitle}
                </div>
                {sectionItems.map((item) => (
                    <button
                        key={item.href}
                        onClick={() => {
                            router.push(item.href);
                            setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 mt-1 text-sm font-medium rounded-lg transition-colors ${
                            isActiveRoute(item.href)
                                ? "text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-r-2 border-orange-600"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        }`}
                    >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${isDark ? "dark" : ""}`}>
            <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <nav
                    className={`
          w-70 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 
          fixed h-full overflow-y-auto z-50 transition-transform duration-300 ease-in-out
          ${
              sidebarOpen
                  ? "translate-x-0"
                  : "-translate-x-full lg:translate-x-0"
          }
        `}
                >
                    <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                        <button
                            onClick={() => router.push("/")}
                            className="text-lg font-bold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            WUJHA PMO
                        </button>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="py-4">
                        {roleLoading ? (
                            <div className="px-5 py-4">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                    Loading...
                                </div>
                                <div className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-400">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                    <span>Loading navigation...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {renderNavSection("main", "Main")}
{/*                                 {renderNavSection("procurement", "Procurement")}
 */}                                {renderNavSection("reporting", "Reporting")}
                            </>
                        )}
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 lg:ml-70 overflow-auto">
                    {/* Header */}
                    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
                                >
                                    <Menu size={20} />
                                </button>
                                
                                {title && (
                                    <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                        {title}
                                    </h1>
                                )}
                            </div>

                            <div className="flex items-center space-x-4">
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
                                        className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 relative"
                                    >
                                        <Bell size={18} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 notification-badge">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    {notificationsOpen && (
                                        <div className="absolute right-0 mt-2 w-96 max-h-[176px] overflow-y-auto bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                                            <div className="py-2 px-4 border-b border-gray-100 dark:border-slate-700 font-semibold text-gray-700 dark:text-gray-200">
                                                Notifications
                                            </div>
                                            {loadingNotifications ? (
                                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                    Loading...
                                                </div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                    No notifications
                                                </div>
                                            ) : (
                                                notifications.map((n) => (
                                                    <div
                                                        key={n.notification_id}
                                                        className={`px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${
                                                            n.status ===
                                                            "UNREAD"
                                                                ? "bg-orange-50 dark:bg-orange-900/10"
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
                                                        <div className="flex flex-col flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                    {n.title}
                                                                </span>
                                                                {n.status ===
                                                                    "UNREAD" && (
                                                                    <span className="w-2 h-2 bg-orange-500 rounded-full inline-block ml-1 animate-pulse-soft" />
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                {n.message}
                                                            </span>
                                                            <span className="text-xs text-gray-400 mt-1">
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
                                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
                                    className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                >
                                    {isDark ? (
                                        <Sun size={16} />
                                    ) : (
                                        <Moon size={16} />
                                    )}
                                </button>

                                <div className="relative" ref={userMenuRef}>
                                    <div
                                        onClick={() =>
                                            setUserMenuOpen(!userMenuOpen)
                                        }
                                        className="flex items-center space-x-2 cursor-pointer"
                                    >
                                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                            {isClient ? nameAbbreviation : "U"}
                                        </div>
                                        <span className="hidden sm:block font-medium text-gray-900 dark:text-gray-100">
                                            {isClient ? fullName : "User"}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-gray-600 dark:text-gray-400 transition-transform ${
                                                userMenuOpen ? "rotate-180" : ""
                                            }`}
                                        />
                                    </div>

                                    {userMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-50">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        router.push("/profile");
                                                        setUserMenuOpen(false);
                                                    }}
                                                    className="flex w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
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
                                                    className="flex w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
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
                                                    className="flex w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
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

                    {/* Page Content */}
                    <div className="p-6">
                        {children}
                    </div>
                </main>
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

export default DashboardLayout;
