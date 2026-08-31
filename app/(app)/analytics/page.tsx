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
            gradient: "from-danger via-accent-pink to-accent-violet",
            icon: Database,
            totalMetric: "System Efficiency Score",
            totalValue: "94.7%",
            totalSubtext: "Across all modules and users",
        },
        ProjectManager: {
            title: "Project Performance Analytics",
            subtitle: "Insights for project optimization and team productivity",
            gradient: "from-info via-accent-indigo to-accent-violet",
            icon: ChartLine,
            totalMetric: "My Projects Success Rate",
            totalValue: "89.3%",
            totalSubtext: "Based on 12 active projects",
        },
        Technical: {
            title: "Technical Performance Analytics",
            subtitle: "Development metrics and quality insights",
            gradient: "from-success via-success to-bright-2-deep",
            icon: Cpu,
            totalMetric: "Code Quality Score",
            totalValue: "92.1%",
            totalSubtext: "Technical delivery excellence",
        },
        PMO: {
            title: "Portfolio Analytics Hub",
            subtitle: "Strategic insights and governance effectiveness",
            gradient: "from-accent-violet via-accent-violet to-accent-indigo",
            icon: Globe,
            totalMetric: "Portfolio Health Index",
            totalValue: "96.2%",
            totalSubtext: "Strategic alignment & governance",
        },
        Executive: {
            title: "Strategic Business Analytics",
            subtitle: "Executive insights for strategic decision making",
            gradient: "from-warning via-bright to-danger",
            icon: Award,
            totalMetric: "Business Impact Score",
            totalValue: "OMR 47.3M",
            totalSubtext: "Value generated this quarter",
        },
        IT: {
            title: "IT Support Analytics Dashboard",
            subtitle: "System performance and infrastructure monitoring",
            gradient: "from-bright-2 via-info to-accent-indigo",
            icon: Shield,
            totalMetric: "System Health Score",
            totalValue: "98.5%",
            totalSubtext: "Infrastructure & support metrics",
        },
        DIR: {
            title: "Director Analytics Dashboard",
            subtitle:
                "Strategic oversight and organizational performance insights",
            gradient: "from-accent-violet via-accent-indigo to-info",
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
            <div className="min-h-screen bg-gradient-to-br from-surface-2 via-info-soft to-accent-indigo-soft p-6">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header Section */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
                            <Brain className="w-8 h-8 text-accent-indigo" />
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-indigo to-accent-violet bg-clip-text text-transparent">
                                Analytics & Insights
                            </h1>
                        </div>
                        <p className="text-lg text-muted max-w-2xl mx-auto">
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
                                            ? "bg-accent-indigo text-white shadow-md scale-105"
                                            : "hover:bg-accent-indigo-soft text-muted"
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
                                <CardTitle className="text-4xl font-bold text-ink-2 mb-2">
                                    {currentData.title}
                                </CardTitle>
                                <CardDescription className="text-xl text-muted mb-6">
                                    {currentData.subtitle}
                                </CardDescription>
                                <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-ink-2">
                                            {currentData.totalValue}
                                        </div>
                                        <div className="text-sm text-muted">
                                            {currentData.totalMetric}
                                        </div>
                                    </div>
                                    <div className="w-px h-12 bg-surface-3" />
                                    <div className="text-sm text-muted">
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
                            <Database className="w-8 h-8 text-danger group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-danger-soft text-danger"
                            >
                                System
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            99.7%
                        </h3>
                        <p className="text-sm text-muted">System Uptime</p>
                        <p className="text-xs text-muted mt-2">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-accent-pink group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-pink-soft text-accent-pink"
                            >
                                Users
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            847
                        </h3>
                        <p className="text-sm text-muted">Active Users</p>
                        <p className="text-xs text-muted mt-2">
                            +12% this month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Activity className="w-8 h-8 text-accent-violet group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-violet-soft text-accent-violet"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            2.3s
                        </h3>
                        <p className="text-sm text-muted">
                            Avg Response Time
                        </p>
                        <p className="text-xs text-muted mt-2">
                            -15% improved
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Shield className="w-8 h-8 text-accent-indigo group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-indigo-soft text-accent-indigo"
                            >
                                Security
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            Zero
                        </h3>
                        <p className="text-sm text-muted">
                            Security Incidents
                        </p>
                        <p className="text-xs text-muted mt-2">
                            Last 90 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-danger to-accent-pink hover:from-danger hover:to-accent-pink text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Settings className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    System Config
                </Button>
                <Button className="bg-gradient-to-r from-accent-pink to-accent-violet hover:from-accent-pink hover:to-accent-violet text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                    Export Logs
                </Button>
                <Button className="bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-accent-violet hover:to-accent-indigo text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Refresh Data
                </Button>
                <Button className="bg-gradient-to-r from-accent-indigo to-info hover:from-accent-indigo hover:to-info text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
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
                            <Target className="w-8 h-8 text-info group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-info-soft text-info"
                            >
                                Projects
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            12/14
                        </h3>
                        <p className="text-sm text-muted">
                            On-Time Delivery
                        </p>
                        <p className="text-xs text-muted mt-2">
                            85.7% success rate
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <DollarSign className="w-8 h-8 text-accent-indigo group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-indigo-soft text-accent-indigo"
                            >
                                Budget
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            92.3%
                        </h3>
                        <p className="text-sm text-muted">
                            Budget Efficiency
                        </p>
                        <p className="text-xs text-muted mt-2">
                            OMR 18.7M managed
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-accent-violet group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-violet-soft text-accent-violet"
                            >
                                Team
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            94.1%
                        </h3>
                        <p className="text-sm text-muted">
                            Team Satisfaction
                        </p>
                        <p className="text-xs text-muted mt-2">
                            67 team members
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-info to-accent-indigo hover:from-info hover:to-accent-indigo text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Performance Report
                </Button>
                <Button className="bg-gradient-to-r from-accent-indigo to-accent-violet hover:from-accent-indigo hover:to-accent-violet text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <TrendingUp className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    Trend Analysis
                </Button>
                <Button className="bg-gradient-to-r from-accent-violet to-accent-pink hover:from-accent-violet hover:to-accent-pink text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Lightbulb className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Optimization Tips
                </Button>
                <Button className="bg-gradient-to-r from-accent-pink to-danger hover:from-accent-pink hover:to-danger text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
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
                            <Cpu className="w-8 h-8 text-success group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-success-soft text-success"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            98.2%
                        </h3>
                        <p className="text-sm text-muted">
                            Code Quality Score
                        </p>
                        <p className="text-xs text-muted mt-2">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Zap className="w-8 h-8 text-success group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-success-soft text-success"
                            >
                                Speed
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            1.8s
                        </h3>
                        <p className="text-sm text-muted">Build Time</p>
                        <p className="text-xs text-muted mt-2">
                            -23% faster
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Star className="w-8 h-8 text-bright-2 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-bright-2-soft text-bright-2"
                            >
                                Quality
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            Zero
                        </h3>
                        <p className="text-sm text-muted">Critical Bugs</p>
                        <p className="text-xs text-muted mt-2">
                            Last 14 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-success to-success hover:from-success hover:to-success text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Activity className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Performance Metrics
                </Button>
                <Button className="bg-gradient-to-r from-success to-bright-2-deep hover:from-success hover:to-bright-2-deep text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <PieChart className="w-4 h-4 mr-2 group-hover:rotate-45 transition-transform duration-300" />
                    Code Analysis
                </Button>
                <Button className="bg-gradient-to-r from-bright-2 to-bright-2-deep hover:from-bright-2-deep hover:to-bright-2-deep text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                    Export Report
                </Button>
                <Button className="bg-gradient-to-r from-bright-2 to-info hover:from-bright-2-deep hover:to-info text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
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
                            <Globe className="w-8 h-8 text-accent-violet group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-violet-soft text-accent-violet"
                            >
                                Portfolio
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            96.2%
                        </h3>
                        <p className="text-sm text-muted">Health Index</p>
                        <p className="text-xs text-muted mt-2">
                            34 active projects
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Target className="w-8 h-8 text-accent-violet group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-violet-soft text-accent-violet"
                            >
                                Alignment
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            89.7%
                        </h3>
                        <p className="text-sm text-muted">
                            Strategic Alignment
                        </p>
                        <p className="text-xs text-muted mt-2">
                            vs corporate goals
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Award className="w-8 h-8 text-accent-indigo group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-indigo-soft text-accent-indigo"
                            >
                                Quality
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            93.4%
                        </h3>
                        <p className="text-sm text-muted">
                            Governance Score
                        </p>
                        <p className="text-xs text-muted mt-2">
                            Process compliance
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-bright-2 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-bright-2-soft text-bright-2"
                            >
                                ROI
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            247%
                        </h3>
                        <p className="text-sm text-muted">Portfolio ROI</p>
                        <p className="text-xs text-muted mt-2">
                            This fiscal year
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-accent-violet to-accent-violet hover:from-accent-violet hover:to-accent-violet text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Globe className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                    Portfolio View
                </Button>
                <Button className="bg-gradient-to-r from-accent-violet to-accent-indigo hover:from-accent-violet hover:to-accent-indigo text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Governance Report
                </Button>
                <Button className="bg-gradient-to-r from-accent-indigo to-bright-2-deep hover:from-accent-indigo hover:to-bright-2-deep text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <TrendingUp className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    ROI Analysis
                </Button>
                <Button className="bg-gradient-to-r from-bright-2 to-accent-violet hover:from-bright-2-deep hover:to-accent-violet text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
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
                            <Award className="w-12 h-12 text-warning group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-warning-soft text-warning text-lg px-4 py-2"
                            >
                                Strategic Value
                            </Badge>
                        </div>
                        <h3 className="text-4xl font-bold text-ink-2 mb-2">
                            OMR 47.3M
                        </h3>
                        <p className="text-lg text-muted mb-2">
                            Business Impact Value
                        </p>
                        <p className="text-sm text-muted">
                            Generated this quarter
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-bright group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-bright-soft text-bright"
                            >
                                Growth
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            +34.7%
                        </h3>
                        <p className="text-sm text-muted">Revenue Growth</p>
                        <p className="text-xs text-muted mt-2">
                            Year over year
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Star className="w-8 h-8 text-danger group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-danger-soft text-danger"
                            >
                                Excellence
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            97.8%
                        </h3>
                        <p className="text-sm text-muted">
                            Client Satisfaction
                        </p>
                        <p className="text-xs text-muted mt-2">
                            Across all projects
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-warning to-bright-deep hover:from-warning hover:to-bright-deep text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Award className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Executive Summary
                </Button>
                <Button className="bg-gradient-to-r from-bright to-danger hover:from-bright-deep hover:to-danger text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <TrendingUp className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    Business Impact
                </Button>
                <Button className="bg-gradient-to-r from-danger to-accent-pink hover:from-danger hover:to-accent-pink text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Strategic Metrics
                </Button>
                <Button className="bg-gradient-to-r from-accent-pink to-accent-violet hover:from-accent-pink hover:to-accent-violet text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
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
                            <Shield className="w-8 h-8 text-bright-2 group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-bright-2-soft text-bright-2"
                            >
                                Security
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            99.9%
                        </h3>
                        <p className="text-sm text-muted">System Uptime</p>
                        <p className="text-xs text-muted mt-2">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Activity className="w-8 h-8 text-info group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-info-soft text-info"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            1.2s
                        </h3>
                        <p className="text-sm text-muted">
                            Avg Response Time
                        </p>
                        <p className="text-xs text-muted mt-2">
                            -20% improved
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CheckCircle className="w-8 h-8 text-success group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-success-soft text-success"
                            >
                                Support
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            94.8%
                        </h3>
                        <p className="text-sm text-muted">
                            Ticket Resolution
                        </p>
                        <p className="text-xs text-muted mt-2">
                            First contact resolution
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Database className="w-8 h-8 text-accent-indigo group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-indigo-soft text-accent-indigo"
                            >
                                Infrastructure
                            </Badge>
                        </div>
                        <h3 className="text-2xl font-bold text-ink-2 mb-1">
                            78.4%
                        </h3>
                        <p className="text-sm text-muted">
                            Resource Utilization
                        </p>
                        <p className="text-xs text-muted mt-2">
                            Optimal range
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button className="bg-gradient-to-r from-bright-2 to-info hover:from-bright-2-deep hover:to-info text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Shield className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    System Health
                </Button>
                <Button className="bg-gradient-to-r from-info to-accent-indigo hover:from-info hover:to-accent-indigo text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Activity className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                    Performance Report
                </Button>
                <Button className="bg-gradient-to-r from-accent-indigo to-accent-violet hover:from-accent-indigo hover:to-accent-violet text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
                    <Database className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Infrastructure
                </Button>
                <Button className="bg-gradient-to-r from-accent-violet to-accent-pink hover:from-accent-violet hover:to-accent-pink text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
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
                            <Award className="w-8 h-8 text-accent-violet group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-accent-violet-soft text-accent-violet"
                            >
                                Strategic
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-ink mb-2">
                            Portfolio Value
                        </h3>
                        <div className="text-3xl font-bold text-accent-violet mb-1">
                            OMR 152.8M
                        </div>
                        <p className="text-sm text-muted">
                            +12.3% from last quarter
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-8 h-8 text-success group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-success-soft text-success"
                            >
                                Performance
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-ink mb-2">
                            ROI Performance
                        </h3>
                        <div className="text-3xl font-bold text-success mb-1">
                            24.7%
                        </div>
                        <p className="text-sm text-muted">
                            Above industry benchmark
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Target className="w-8 h-8 text-info group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-info-soft text-info"
                            >
                                Delivery
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-ink mb-2">
                            Strategic Goals
                        </h3>
                        <div className="text-3xl font-bold text-info mb-1">
                            87%
                        </div>
                        <p className="text-sm text-muted">
                            On track for annual targets
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <AlertTriangle className="w-8 h-8 text-bright group-hover:scale-110 transition-transform duration-300" />
                            <Badge
                                variant="secondary"
                                className="bg-bright-soft text-bright"
                            >
                                Risk
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-ink mb-2">
                            Risk Score
                        </h3>
                        <div className="text-3xl font-bold text-bright mb-1">
                            Low
                        </div>
                        <p className="text-sm text-muted">
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
                            <BarChart3 className="w-5 h-5 text-accent-violet" />
                            Portfolio Performance
                        </CardTitle>
                        <CardDescription>
                            Strategic portfolio metrics and trends
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 flex items-center justify-center text-muted">
                            Portfolio performance chart would be here
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-success" />
                            Strategic KPIs
                        </CardTitle>
                        <CardDescription>
                            Key performance indicators dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 flex items-center justify-center text-muted">
                            Strategic KPIs chart would be here
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
