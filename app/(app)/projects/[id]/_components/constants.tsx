"use client";

import React from "react";
import {
    BarChart3,
    Target,
    FolderTree,
    Calendar,
    Users,
    DollarSign,
    AlertTriangle,
    FileText,
    Activity,
    CheckCircleIcon,
    CheckCircle,
    Shield,
    Edit,
    Calculator,
    UserPlus,
    Archive,
    Trash2,
    RefreshCw,
    Download,
} from "lucide-react";

export const getRoleSpecificTabs = (role: string) => {
    const baseTabs = [
        {
            id: "overview",
            label: "Overview",
            icon: <BarChart3 size={16} />,
        },
    ];

    switch (role) {
        case "admin":
            return [
                ...baseTabs,
                { id: "tasks", label: "Tasks", icon: <Target size={16} /> },
                { id: "wbs", label: "WBS", icon: <FolderTree size={16} /> },
                {
                    id: "gantt",
                    label: "Gantt Chart",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "critical-path",
                    label: "Critical Path",
                    icon: <Activity size={16} />,
                },
                { id: "team", label: "Team", icon: <Users size={16} /> },
                {
                    id: "budget",
                    label: "Budget",
                    icon: <DollarSign size={16} />,
                },
                {
                    id: "schedule",
                    label: "Schedule",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "risks",
                    label: "Risks",
                    icon: <AlertTriangle size={16} />,
                },
                {
                    id: "procurement",
                    label: "Procurement",
                    icon: <FileText size={16} />,
                },
                {
                    id: "documents",
                    label: "Documents",
                    icon: <FileText size={16} />,
                },
                {
                    id: "closure",
                    label: "Closure",
                    icon: <CheckCircleIcon size={16} />,
                },
            ];

        case "project-manager":
            return [
                ...baseTabs,
                { id: "tasks", label: "Tasks", icon: <Target size={16} /> },
                { id: "wbs", label: "WBS", icon: <FolderTree size={16} /> },
                {
                    id: "gantt",
                    label: "Gantt Chart",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "critical-path",
                    label: "Critical Path",
                    icon: <Activity size={16} />,
                },
                { id: "team", label: "Team", icon: <Users size={16} /> },
                {
                    id: "schedule",
                    label: "Schedule",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "budget",
                    label: "Budget",
                    icon: <DollarSign size={16} />,
                },
                {
                    id: "risks",
                    label: "Risks",
                    icon: <AlertTriangle size={16} />,
                },
                {
                    id: "procurement",
                    label: "Procurement",
                    icon: <FileText size={16} />,
                },
                {
                    id: "closure",
                    label: "Closure",
                    icon: <CheckCircleIcon size={16} />,
                },
            ];

        case "technical":
            return [
                ...baseTabs,
                {
                    id: "my-tasks",
                    label: "My Tasks",
                    icon: <Target size={16} />,
                },
                { id: "wbs", label: "WBS", icon: <FolderTree size={16} /> },
                {
                    id: "gantt",
                    label: "Timeline",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "critical-path",
                    label: "Critical Path",
                    icon: <Activity size={16} />,
                },
                {
                    id: "documents",
                    label: "Documents",
                    icon: <FileText size={16} />,
                },
                {
                    id: "schedule",
                    label: "Schedule",
                    icon: <Calendar size={16} />,
                },
                { id: "team", label: "Team", icon: <Users size={16} /> },
                {
                    id: "risks",
                    label: "Risks",
                    icon: <AlertTriangle size={16} />,
                },
                {
                    id: "procurement",
                    label: "Procurement",
                    icon: <FileText size={16} />,
                },
                {
                    id: "closure",
                    label: "Closure",
                    icon: <CheckCircleIcon size={16} />,
                },
            ];

        case "pmo":
            return [
                ...baseTabs,
                { id: "tasks", label: "Tasks", icon: <Target size={16} /> },
                { id: "wbs", label: "WBS", icon: <FolderTree size={16} /> },
                {
                    id: "gantt",
                    label: "Timeline",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "governance",
                    label: "Governance",
                    icon: <Shield size={16} />,
                },
                {
                    id: "compliance",
                    label: "Compliance",
                    icon: <CheckCircle size={16} />,
                },
                {
                    id: "portfolio",
                    label: "Portfolio Alignment",
                    icon: <Target size={16} />,
                },
                {
                    id: "reports",
                    label: "Reports",
                    icon: <BarChart3 size={16} />,
                },
            ];

        case "executive":
            return [
                ...baseTabs,
                {
                    id: "executive-summary",
                    label: "Executive Summary",
                    icon: <BarChart3 size={16} />,
                },
                {
                    id: "tasks",
                    label: "Tasks Overview",
                    icon: <Target size={16} />,
                },
                {
                    id: "procurement",
                    label: "Procurement",
                    icon: <FileText size={16} />,
                },
                {
                    id: "wbs",
                    label: "WBS Summary",
                    icon: <FolderTree size={16} />,
                },
                {
                    id: "gantt",
                    label: "Strategic Timeline",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "financial",
                    label: "Financial Performance",
                    icon: <DollarSign size={16} />,
                },
                {
                    id: "strategic",
                    label: "Strategic Impact",
                    icon: <Target size={16} />,
                },
            ];

        case "fin":
            return [
                ...baseTabs,
                {
                    id: "my-tasks",
                    label: "My Tasks",
                    icon: <Target size={16} />,
                },
                {
                    id: "budget",
                    label: "Budget",
                    icon: <DollarSign size={16} />,
                },
                {
                    id: "documents",
                    label: "Documents",
                    icon: <FileText size={16} />,
                },
                {
                    id: "schedule",
                    label: "Schedule",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "gantt",
                    label: "Timeline",
                    icon: <Calendar size={16} />,
                },
            ];

        case "procurement":
            return [
                ...baseTabs,
                {
                    id: "my-tasks",
                    label: "My Tasks",
                    icon: <Target size={16} />,
                },
                {
                    id: "procurement",
                    label: "Procurement",
                    icon: <FileText size={16} />,
                },
                {
                    id: "documents",
                    label: "Documents",
                    icon: <FileText size={16} />,
                },
                {
                    id: "schedule",
                    label: "Schedule",
                    icon: <Calendar size={16} />,
                },
                {
                    id: "gantt",
                    label: "Timeline",
                    icon: <Calendar size={16} />,
                },
            ];

        case "QAQC":
            return [
                ...baseTabs,
                {
                    id: "my-tasks",
                    label: "My Tasks",
                    icon: <Target size={16} />,
                },
                {
                    id: "risks",
                    label: "Risks",
                    icon: <AlertTriangle size={16} />,
                },
                {
                    id: "closure",
                    label: "Closure",
                    icon: <CheckCircleIcon size={16} />,
                },
            ];

        case "IT":
            return [
                ...baseTabs,
                {
                    id: "tasks",
                    label: "All Tasks",
                    icon: <Target size={16} />,
                },
                {
                    id: "documents",
                    label: "Documents",
                    icon: <FileText size={16} />,
                },
                {
                    id: "schedule",
                    label: "Schedule",
                    icon: <Calendar size={16} />,
                },
            ];

        default:
            return [
                ...baseTabs,
                {
                    id: "my-tasks",
                    label: "My Tasks",
                    icon: <Target size={16} />,
                },
                { id: "team", label: "Team", icon: <Users size={16} /> },
                {
                    id: "documents",
                    label: "Documents",
                    icon: <FileText size={16} />,
                },
            ];
    }
};

export const getRoleSpecificActions = (role: string) => {
    switch (role) {
        case "admin":
            return [
                {
                    label: "Edit Project",
                    icon: <Edit size={16} />,
                    action: "edit",
                    variant: "primary",
                },
                {
                    label: "Generate BOM",
                    icon: <Calculator size={16} />,
                    action: "generate_bom",
                    variant: "secondary",
                },
                {
                    label: "Change Manager",
                    icon: <UserPlus size={16} />,
                    action: "change_manager",
                    variant: "secondary",
                },
                {
                    label: "Archive",
                    icon: <Archive size={16} />,
                    action: "archive",
                    variant: "secondary",
                },
                {
                    label: "Delete",
                    icon: <Trash2 size={16} />,
                    action: "delete",
                    variant: "danger",
                },
            ];

        case "project-manager":
            return [
                {
                    label: "Update Status",
                    icon: <RefreshCw size={16} />,
                    action: "update_status",
                    variant: "primary",
                },
                {
                    label: "Generate BOM",
                    icon: <Calculator size={16} />,
                    action: "generate_bom",
                    variant: "secondary",
                },
                {
                    label: "Archive",
                    icon: <Archive size={16} />,
                    action: "archive",
                    variant: "secondary",
                },
                {
                    label: "Generate Report",
                    icon: <Download size={16} />,
                    action: "generate_report",
                    variant: "secondary",
                },
            ];

        case "technical":
            return [];

        case "pmo":
            return [
                {
                    label: "Compliance Report",
                    icon: <FileText size={16} />,
                    action: "compliance_report",
                    variant: "primary",
                },
                {
                    label: "Flag Violation",
                    icon: <AlertTriangle size={16} />,
                    action: "flag_violation",
                    variant: "secondary",
                },
                {
                    label: "Audit Project",
                    icon: <Shield size={16} />,
                    action: "audit",
                    variant: "secondary",
                },
            ];

        case "executive":
            return [];

        default:
            return [];
    }
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "OMR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

export const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
        case "planning":
            return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
        case "execution":
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
        case "completed":
            return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
        case "on_hold":
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
        case "at_risk":
            return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
        case "delayed":
            return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
        case "closed":
            return `${baseClasses} bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400`;
        default:
            return baseClasses;
    }
};

export const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (priority) {
        case "high":
            return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
        case "medium":
            return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
        case "low":
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
        default:
            return baseClasses;
    }
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getFileIcon = (fileName: string | undefined | null) => {
    if (!fileName || typeof fileName !== "string") {
        return <FileText className="w-5 h-5 text-gray-500" />;
    }

    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "pdf":
            return <FileText className="w-5 h-5 text-red-500" />;
        case "doc":
        case "docx":
            return <FileText className="w-5 h-5 text-blue-500" />;
        case "xls":
        case "xlsx":
            return <FileText className="w-5 h-5 text-green-500" />;
        case "ppt":
        case "pptx":
            return <FileText className="w-5 h-5 text-orange-500" />;
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
            return <FileText className="w-5 h-5 text-purple-500" />;
        default:
            return <FileText className="w-5 h-5 text-gray-500" />;
    }
};

export const getProgressColors = (percentage: number) => {
    if (percentage >= 90)
        return { text: "text-green-600", bg: "bg-green-600" };
    if (percentage >= 75)
        return { text: "text-blue-600", bg: "bg-blue-600" };
    if (percentage >= 50)
        return { text: "text-yellow-600", bg: "bg-yellow-600" };
    if (percentage >= 25)
        return { text: "text-orange-600", bg: "bg-orange-600" };
    return { text: "text-red-600", bg: "bg-red-600" };
};

export const getBudgetColors = (utilization: number) => {
    if (utilization <= 80)
        return { text: "text-green-600", bg: "bg-green-600" };
    if (utilization <= 90)
        return { text: "text-blue-600", bg: "bg-blue-600" };
    if (utilization <= 100)
        return { text: "text-yellow-600", bg: "bg-yellow-600" };
    if (utilization <= 110)
        return { text: "text-orange-600", bg: "bg-orange-600" };
    return { text: "text-red-600", bg: "bg-red-600" };
};

export const getHealthColors = (healthScore: number) => {
    if (healthScore >= 90)
        return { text: "text-green-600", bg: "bg-green-600" };
    if (healthScore >= 80)
        return { text: "text-blue-600", bg: "bg-blue-600" };
    if (healthScore >= 70)
        return { text: "text-yellow-600", bg: "bg-yellow-600" };
    if (healthScore >= 60)
        return { text: "text-orange-600", bg: "bg-orange-600" };
    return { text: "text-red-600", bg: "bg-red-600" };
};

export const getRiskColors = (riskPercent: number) => {
    if (riskPercent <= 20)
        return { text: "text-green-600", bg: "bg-green-600" };
    if (riskPercent <= 40)
        return { text: "text-blue-600", bg: "bg-blue-600" };
    if (riskPercent <= 60)
        return { text: "text-yellow-600", bg: "bg-yellow-600" };
    if (riskPercent <= 80)
        return { text: "text-orange-600", bg: "bg-orange-600" };
    return { text: "text-red-600", bg: "bg-red-600" };
};
