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
            return `${baseClasses} bg-info-soft text-info  `;
        case "execution":
            return `${baseClasses} bg-success-soft text-success  `;
        case "completed":
            return `${baseClasses} bg-accent-violet-soft text-accent-violet  `;
        case "on_hold":
            return `${baseClasses} bg-surface-2 text-ink-2  `;
        case "at_risk":
            return `${baseClasses} bg-warning-soft text-warning  `;
        case "delayed":
            return `${baseClasses} bg-danger-soft text-danger  `;
        case "closed":
            return `${baseClasses} bg-surface-3 text-ink-3  `;
        default:
            return baseClasses;
    }
};

export const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (priority) {
        case "high":
            return `${baseClasses} bg-danger-soft text-danger  `;
        case "medium":
            return `${baseClasses} bg-warning-soft text-warning  `;
        case "low":
            return `${baseClasses} bg-success-soft text-success  `;
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
        return <FileText className="w-5 h-5 text-muted" />;
    }

    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "pdf":
            return <FileText className="w-5 h-5 text-danger" />;
        case "doc":
        case "docx":
            return <FileText className="w-5 h-5 text-info" />;
        case "xls":
        case "xlsx":
            return <FileText className="w-5 h-5 text-success" />;
        case "ppt":
        case "pptx":
            return <FileText className="w-5 h-5 text-bright" />;
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
            return <FileText className="w-5 h-5 text-accent-violet" />;
        default:
            return <FileText className="w-5 h-5 text-muted" />;
    }
};

export const getProgressColors = (percentage: number) => {
    if (percentage >= 90)
        return { text: "text-success", bg: "bg-success" };
    if (percentage >= 75)
        return { text: "text-info", bg: "bg-info" };
    if (percentage >= 50)
        return { text: "text-warning", bg: "bg-warning" };
    if (percentage >= 25)
        return { text: "text-bright", bg: "bg-bright" };
    return { text: "text-danger", bg: "bg-danger" };
};

export const getBudgetColors = (utilization: number) => {
    if (utilization <= 80)
        return { text: "text-success", bg: "bg-success" };
    if (utilization <= 90)
        return { text: "text-info", bg: "bg-info" };
    if (utilization <= 100)
        return { text: "text-warning", bg: "bg-warning" };
    if (utilization <= 110)
        return { text: "text-bright", bg: "bg-bright" };
    return { text: "text-danger", bg: "bg-danger" };
};

export const getHealthColors = (healthScore: number) => {
    if (healthScore >= 90)
        return { text: "text-success", bg: "bg-success" };
    if (healthScore >= 80)
        return { text: "text-info", bg: "bg-info" };
    if (healthScore >= 70)
        return { text: "text-warning", bg: "bg-warning" };
    if (healthScore >= 60)
        return { text: "text-bright", bg: "bg-bright" };
    return { text: "text-danger", bg: "bg-danger" };
};

export const getRiskColors = (riskPercent: number) => {
    if (riskPercent <= 20)
        return { text: "text-success", bg: "bg-success" };
    if (riskPercent <= 40)
        return { text: "text-info", bg: "bg-info" };
    if (riskPercent <= 60)
        return { text: "text-warning", bg: "bg-warning" };
    if (riskPercent <= 80)
        return { text: "text-bright", bg: "bg-bright" };
    return { text: "text-danger", bg: "bg-danger" };
};
