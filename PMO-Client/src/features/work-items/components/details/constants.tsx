import React from "react";
import {
  Clock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

export const getStatusBadge = (status: string) => {
  const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
  switch (status) {
    case "todo":
      return `${baseClasses} bg-surface-2 text-ink-2  `;
    case "in_progress":
      return `${baseClasses} bg-info-soft text-info  `;
    case "completed":
      return `${baseClasses} bg-success-soft text-success  `;
    case "on_hold":
      return `${baseClasses} bg-warning-soft text-warning  `;
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

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "todo":
      return <Clock className="w-5 h-5" />;
    case "in_progress":
      return <RefreshCw className="w-5 h-5" />;
    case "completed":
      return <CheckCircle className="w-5 h-5" />;
    case "on_hold":
      return <AlertTriangle className="w-5 h-5" />;
    default:
      return <Clock className="w-5 h-5" />;
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
