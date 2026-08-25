"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3,
    TrendingUp,
    Users,
    DollarSign,
    Target,
    AlertTriangle,
    CheckCircle,
    Brain,
    Lightbulb,
    ChartLine,
    PieChart,
    Activity,
    Zap,
    Filter,
    Download,
    Share2,
    Settings,
    RefreshCw,
    Calendar,
    Clock,
    Star,
    Award,
    Globe,
    Cpu,
    Database,
    Shield,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

type UserRole =
    | "Admin"
    | "ProjectManager"
    | "Technical"
    | "PMO"
    | "Executive"
    | "IT"
    | "DIR";

export default function AnalyticsPage() {
    const [currentRole, setCurrentRole] = useState<UserRole>("Admin");

    const roleData: Record<UserRole, any> = {
        Admin: {
            title: "System Analytics Dashboard",
            subtitle: "Comprehensive system insights and optimization metrics",
            gradient: "from-red-500 via-pink-500 to-purple-600",
            icon: Database,
            totalMetric: "System Efficiency Score",
            totalValue: "94.7%",
            totalSubtext: "Across all modules and users",
        },
        ProjectManager: {
            title: "Project Performance Analytics",
            subtitle: "Insights for project optimization and team productivity",
            gradient: "from-blue-500 via-indigo-500 to-purple-600",
            icon: ChartLine,
            totalMetric: "My Projects Success Rate",
            totalValue: "89.3%",
            totalSubtext: "Based on 12 active projects",
        },
        Technical: {
            title: "Technical Performance Analytics",
            subtitle: "Development metrics and quality insights",
            gradient: "from-green-500 via-emerald-500 to-teal-600",
            icon: Cpu,
            totalMetric: "Code Quality Score",
            totalValue: "92.1%",
            totalSubtext: "Technical delivery excellence",
        },
        PMO: {
            title: "Portfolio Analytics Hub",
            subtitle: "Strategic insights and governance effectiveness",
            gradient: "from-purple-500 via-violet-500 to-indigo-600",
            icon: Globe,
            totalMetric: "Portfolio Health Index",
            totalValue: "96.2%",
            totalSubtext: "Strategic alignment & governance",
        },
        Executive: {
            title: "Strategic Business Analytics",
            subtitle: "Executive insights for strategic decision making",
            gradient: "from-amber-500 via-orange-500 to-red-600",
            icon: Award,
            totalMetric: "Business Impact Score",
            totalValue: "OMR 47.3M",
            totalSubtext: "Value generated this quarter",
        },
        IT: {
            title: "IT Support Analytics Dashboard",
            subtitle: "System performance and infrastructure monitoring",
            gradient: "from-cyan-500 via-blue-500 to-indigo-600",
            icon: Shield,
            totalMetric: "System Health Score",
            totalValue: "98.5%",
            totalSubtext: "Infrastructure & support metrics",
        },
        DIR: {
            title: "Director Analytics Dashboard",
            subtitle:
                "Strategic oversight and organizational performance insights",
            gradient: "from-purple-600 via-indigo-600 to-blue-700",
            icon: Award,
            totalMetric: "Organizational Value",
            totalValue: "OMR 152.8M",
            totalSubtext: "Total portfolio value",
        },
    };

    const currentData = roleData[currentRole];
    const IconComponent = currentData.icon;

    return (
        <DashboardLayout title="Analytics Dashboard">
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header Section */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
                            <Brain className="w-8 h-8 text-indigo-600" />
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Analytics & Insights
                            </h1>
                        </div>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Advanced data analysis and insights for strategic
                            optimization and future planning
                        </p>
                    </div>

                    {/* Role Switcher */}
                    <div className="flex justify-center">
                        <div className="flex gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
                            {Object.keys(roleData).map((role) => (
                                <Button
                                    key={role}
                                    variant={
                                        currentRole === role
                                            ? "default"
                                            : "ghost"
                                    }
                                    size="sm"
                                    onClick={() =>
                                        setCurrentRole(role as UserRole)
                                    }
                                    className={`transition-all duration-300 ${
                                        currentRole === role
                                            ? "bg-indigo-600 text-white shadow-md scale-105"
                                            : "hover:bg-indigo-50 text-slate-600"
                                    }`}
                                >
                                    {role}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Role-Based Content */}
                    <div key={currentRole} className="animate-fadeIn space-y-8">
                        {/* Hero Card */}
                        <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                            <div
                                className={`absolute inset-0 bg-gradient-to-r ${currentData.gradient} opacity-10`}
                            />
                            <CardHeader className="relative z-10 text-center py-12">
                                <div className="flex justify-center mb-4">
                                    <div
                                        className={`p-4 rounded-2xl bg-gradient-to-r ${currentData.gradient} shadow-lg`}
                                    >
                                        <IconComponent className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                                <CardTitle className="text-4xl font-bold text-slate-800 mb-2">
                                    {currentData.title}
                                </CardTitle>
                                <CardDescription className="text-xl text-slate-600 mb-6">
                                    {currentData.subtitle}
                                </CardDescription>
                                <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-slate-800">
                                            {currentData.totalValue}
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            {currentData.totalMetric}
                                        </div>
                                    </div>
                                    <div className="w-px h-12 bg-slate-200" />
                                    <div className="text-sm text-slate-500">
                                        {currentData.totalSubtext}
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Content will be rendered based on role */}
                        {currentRole === "Admin" && <AdminAnalytics />}
                        {currentRole === "ProjectManager" && (
                            <ProjectManagerAnalytics />
                        )}
                        {currentRole === "Technical" && <TechnicalAnalytics />}
                        {currentRole === "PMO" && <PMOAnalytics />}
                        {currentRole === "Executive" && <ExecutiveAnalytics />}
                        {currentRole === "IT" && <ITAnalytics />}
                        {currentRole === "DIR" && <DirectorAnalytics />}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Admin Analytics Component
function AdminAnalytics() {
    return (
        <div className="space-y-6">
            {/* System Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Database className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-red-50 text-red-600"
                            >
                                System
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            99.7%
                        </h3>
                        <p className="text-sm text-slate-600">System Uptime</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-pink-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-pink-50 text-pink-600"
                            >
                                Users
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            847
                        </h3>
                        <p className="text-sm text-slate-600">Active Users</p>
                        <p className="text-xs text-slate-500 mt-2">
                            +12% this month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Activity className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-purple-50 text-purple-600"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            2.3s
                        </h3>
                        <p className="text-sm text-slate-600">
                            Avg Response Time
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            -15% improved
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Shield className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-600"
                            >
                                Security
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            Zero
                        </h3>
                        <p className="text-sm text-slate-600">
                            Security Incidents
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Last 90 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Settings className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    System Config
                </Button>
                <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                    Export Logs
                </Button>
                <Button className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Refresh Data
                </Button>
                <Button className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter View
                </Button>
            </div>
        </div>
    );
}

// Project Manager Analytics Component
function ProjectManagerAnalytics() {
    return (
        <div className="space-y-6">
            {/* Project Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Target className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-blue-50 text-blue-600"
                            >
                                Projects
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            12/14
                        </h3>
                        <p className="text-sm text-slate-600">
                            On-Time Delivery
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            85.7% success rate
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <DollarSign className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-600"
                            >
                                Budget
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            92.3%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Budget Efficiency
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            OMR 18.7M managed
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-purple-50 text-purple-600"
                            >
                                Team
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            94.1%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Team Satisfaction
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            67 team members
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Performance Report
                </Button>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <TrendingUp className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    Trend Analysis
                </Button>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Lightbulb className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Optimization Tips
                </Button>
                <Button className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Insights
                </Button>
            </div>
        </div>
    );
}

// Technical Analytics Component
function TechnicalAnalytics() {
    return (
        <div className="space-y-6">
            {/* Technical Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Cpu className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-green-50 text-green-600"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            98.2%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Code Quality Score
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Zap className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-emerald-50 text-emerald-600"
                            >
                                Speed
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            1.8s
                        </h3>
                        <p className="text-sm text-slate-600">Build Time</p>
                        <p className="text-xs text-slate-500 mt-2">
                            -23% faster
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Star className="w-8 h-8 text-teal-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-teal-50 text-teal-600"
                            >
                                Quality
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            Zero
                        </h3>
                        <p className="text-sm text-slate-600">Critical Bugs</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Last 14 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Activity className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Performance Metrics
                </Button>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <PieChart className="w-4 h-4 mr-2 group-hover:rotate-45 transition-transform duration-300" />
                    Code Analysis
                </Button>
                <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                    Export Report
                </Button>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Settings className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Configure
                </Button>
            </div>
        </div>
    );
}

// PMO Analytics Component
function PMOAnalytics() {
    return (
        <div className="space-y-6">
            {/* Portfolio Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Globe className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-purple-50 text-purple-600"
                            >
                                Portfolio
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            96.2%
                        </h3>
                        <p className="text-sm text-slate-600">Health Index</p>
                        <p className="text-xs text-slate-500 mt-2">
                            34 active projects
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Target className="w-8 h-8 text-violet-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-violet-50 text-violet-600"
                            >
                                Alignment
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            89.7%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Strategic Alignment
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            vs corporate goals
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Award className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-600"
                            >
                                Quality
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            93.4%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Governance Score
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Process compliance
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-cyan-50 text-cyan-600"
                            >
                                ROI
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            247%
                        </h3>
                        <p className="text-sm text-slate-600">Portfolio ROI</p>
                        <p className="text-xs text-slate-500 mt-2">
                            This fiscal year
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Globe className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Portfolio View
                </Button>
                <Button className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Governance Report
                </Button>
                <Button className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <TrendingUp className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    ROI Analysis
                </Button>
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Share2 className="w-4 h-4 mr-2" />
                    Strategic Report
                </Button>
            </div>
        </div>
    );
}

// Executive Analytics Component
function ExecutiveAnalytics() {
    return (
        <div className="space-y-6">
            {/* Executive Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group col-span-full lg:col-span-1">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <Award className="w-12 h-12 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-amber-50 text-amber-600 text-lg px-4 py-2"
                            >
                                Strategic Value
                            </Badge>
                        </div>
                        <h3 className="text-4xl font-bold text-slate-800 mb-2">
                            OMR 47.3M
                        </h3>
                        <p className="text-lg text-slate-600 mb-2">
                            Business Impact Value
                        </p>
                        <p className="text-sm text-slate-500">
                            Generated this quarter
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-orange-50 text-orange-600"
                            >
                                Growth
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            +34.7%
                        </h3>
                        <p className="text-sm text-slate-600">Revenue Growth</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Year over year
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Star className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-red-50 text-red-600"
                            >
                                Excellence
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            97.8%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Client Satisfaction
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Across all projects
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Award className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Executive Summary
                </Button>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <TrendingUp className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    Business Impact
                </Button>
                <Button className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Strategic Metrics
                </Button>
                <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                    Board Report
                </Button>
            </div>
        </div>
    );
}

// IT Analytics Component
function ITAnalytics() {
    return (
        <div className="space-y-6">
            {/* IT Support Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Shield className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-cyan-50 text-cyan-600"
                            >
                                Security
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            99.9%
                        </h3>
                        <p className="text-sm text-slate-600">System Uptime</p>
                        <p className="text-xs text-slate-500 mt-2">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Activity className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-blue-50 text-blue-600"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            1.2s
                        </h3>
                        <p className="text-sm text-slate-600">
                            Avg Response Time
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            -20% improved
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CheckCircle className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-green-50 text-green-600"
                            >
                                Support
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            94.8%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Ticket Resolution
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            First contact resolution
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Database className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-600"
                            >
                                Infrastructure
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">
                            78.4%
                        </h3>
                        <p className="text-sm text-slate-600">
                            Resource Utilization
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Optimal range
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Shield className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    System Health
                </Button>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Activity className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    Performance Report
                </Button>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Database className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Infrastructure
                </Button>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                    IT Report
                </Button>
            </div>
        </div>
    );
}

// Director Analytics Component
function DirectorAnalytics() {
    return (
        <div className="space-y-6">
            {/* Strategic Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Award className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-purple-50 text-purple-600"
                            >
                                Strategic
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Portfolio Value
                        </h3>
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                            OMR 152.8M
                        </div>
                        <p className="text-sm text-gray-600">
                            +12.3% from last quarter
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-green-50 text-green-600"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            ROI Performance
                        </h3>
                        <div className="text-3xl font-bold text-green-600 mb-1">
                            24.7%
                        </div>
                        <p className="text-sm text-gray-600">
                            Above industry benchmark
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Target className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-blue-50 text-blue-600"
                            >
                                Delivery
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Strategic Goals
                        </h3>
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                            87%
                        </div>
                        <p className="text-sm text-gray-600">
                            On track for annual targets
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <AlertTriangle className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-orange-50 text-orange-600"
                            >
                                Risk
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Risk Score
                        </h3>
                        <div className="text-3xl font-bold text-orange-600 mb-1">
                            Low
                        </div>
                        <p className="text-sm text-gray-600">
                            3 active risk items
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Strategic Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            Portfolio Performance
                        </CardTitle>
                        <CardDescription>
                            Strategic portfolio metrics and trends
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 flex items-center justify-center text-gray-500">
                            Portfolio performance chart would be here
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Strategic KPIs
                        </CardTitle>
                        <CardDescription>
                            Key performance indicators dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 flex items-center justify-center text-gray-500">
                            Strategic KPIs chart would be here
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
