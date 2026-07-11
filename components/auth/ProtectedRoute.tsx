"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

// Skeleton component for the dashboard layout
const DashboardSkeleton = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header Skeleton */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Title */}
                    <div className="flex items-center">
                        <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-32 animate-pulse"></div>
                    </div>

                    {/* Right side - Search, User menu */}
                    <div className="flex items-center space-x-4">
                        <div className="h-10 bg-gray-200 dark:bg-slate-600 rounded w-64 animate-pulse"></div>
                        <div className="h-10 w-10 bg-gray-200 dark:bg-slate-600 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        </header>

        <div className="flex">
            {/* Sidebar Skeleton */}
            <div className="w-64 bg-white dark:bg-slate-800 shadow-sm border-r border-gray-200 dark:border-slate-700 min-h-screen">
                <div className="p-4">
                    {/* Navigation items skeleton */}
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center space-x-3 mb-4"
                        >
                            <div className="h-5 w-5 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
                            <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-32 animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Page header skeleton */}
                    <div className="mb-6">
                        <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-48 animate-pulse mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-32 animate-pulse"></div>
                    </div>

                    {/* Content grid skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 animate-pulse"
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
                                    <div className="h-5 bg-gray-200 dark:bg-slate-600 rounded-full w-16"></div>
                                </div>
                                <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-full mb-4"></div>
                                <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded w-full mb-2"></div>
                                <div className="h-2 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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
    }, [router]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return <>{children}</>;
}
