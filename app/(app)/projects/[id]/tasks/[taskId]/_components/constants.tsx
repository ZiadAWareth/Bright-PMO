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
      return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    case "in_progress":
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
    case "completed":
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
    case "on_hold":
      return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
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
