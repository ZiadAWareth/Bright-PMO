"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  ArrowLeft,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Upload,
  Download,
  Eye,
  Trash2,
  Calendar,
  User,
  FileText,
  MessageSquare,
  Plus,
  Edit,
  Save,
  X,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MentionTextarea from "@/components/MentionTextarea";
import ResourceAssignmentModal from "@/components/scheduler/ResourceAssignmentModal";
import type { Task } from "./_components/types";
import {
  getStatusBadge,
  getPriorityBadge,
  getStatusIcon,
  formatFileSize,
  getFileIcon,
} from "./_components/constants";
import EditAssignmentModal from "./_components/EditAssignmentModal";
import FieldDataModal from "./_components/FieldDataModal";
import CommentThread from "./_components/CommentThread";
import { useTaskData } from "./_hooks/useTaskData";

const TaskDetailsPage = ({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) => {
  const {
    router,
    activeView, setActiveView,
    loading,
    projectId,
    taskId,
    task,
    projectName,
    currentUserId,
    showProgressModal, setShowProgressModal,
    showTimeLogModal, setShowTimeLogModal,
    showResourceModal, setShowResourceModal,
    showEditModal, setShowEditModal,
    showDeleteDocumentModal, setShowDeleteDocumentModal,
    selectedAssignment, setSelectedAssignment,
    documentToDelete,
    isUpdatingProgress,
    isLoggingTime,
    showUploadModal, setShowUploadModal,
    uploadFiles, setUploadFiles,
    uploadDescription, setUploadDescription,
    isUploading,
    comments,
    documents,
    newComment, setNewComment,
    isAddingComment,
    replyingTo,
    replyText, setReplyText,
    isAddingReply,
    fieldDataEntries,
    showFieldDataModal, setShowFieldDataModal,
    editingFieldData, setEditingFieldData,
    isSubmittingFieldData,
    allResources,
    userRole,
    isTaskLocked,
    lockReasons,
    canAccessLocked,
    hasTaskAccess,
    submitProgressUpdate,
    submitTimeLog,
    handleCreateFieldData,
    handleUpdateFieldData,
    handleDeleteFieldData,
    handleResourceAssign,
    handleUnassignResource,
    handleEditAssignment,
    addComment,
    addReply,
    handleReplyClick,
    cancelReply,
    handleFileSelect,
    handleUploadDocument,
    handleViewDocument,
    handleDownloadDocument,
    handleDeleteDocument,
    confirmDeleteDocument,
  } = useTaskData(params);

  const isDarkMode =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const isTaskOverdue = () => {
    return (
      task &&
      new Date(task.end_date) < new Date() &&
      task.status !== "completed"
    );
  };

  const getDaysUntilDue = () => {
    if (!task) return 0;
    const today = new Date();
    const due = new Date(task.end_date);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          title="Task Details"
          onViewChange={setActiveView}
          activeView={activeView}
        >
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!task) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          title="Task Details"
          onViewChange={setActiveView}
          activeView={activeView}
        >
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Task not found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The task you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (hasTaskAccess === false) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          title="Access Denied"
          onViewChange={setActiveView}
          activeView={activeView}
        >
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to view the details of this task. Only
              Project Managers (PJM), PMO, Administrators, and users assigned to
              this task can access task details.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Your current role:{" "}
              <span className="font-medium">{userRole || "Unknown"}</span>
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => router.push(`/projects/${projectId}/tasks`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Tasks
              </button>
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Back to Project
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (hasTaskAccess === null) {
    return (
      <ProtectedRoute>
        <DashboardLayout
          title="Task Details"
          onViewChange={setActiveView}
          activeView={activeView}
        >
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const overdue = isTaskOverdue();
  const daysUntilDue = getDaysUntilDue();
  return (
    <ProtectedRoute>
      <DashboardLayout
        title="Task Details"
        onViewChange={setActiveView}
        activeView={activeView}
      >
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <button
            onClick={() => router.push("/projects")}
            className="hover:text-orange-600 transition-colors"
          >
            Projects
          </button>
          <span>/</span>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="hover:text-orange-600 transition-colors"
          >
            {projectName}
          </button>
          <span>/</span>
          <button
            onClick={() => router.push(`/projects/${projectId}/tasks`)}
            className="hover:text-orange-600 transition-colors"
          >
            Tasks
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{task.name}</span>
        </div>

        {/* Task Dependency Warning */}
        {isTaskLocked && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-amber-800 dark:text-amber-200 font-medium mb-2">
                  Task Access Restricted
                </h3>
                <div className="text-amber-700 dark:text-amber-300 text-sm space-y-1">
                  <p>This task is locked due to incomplete dependencies:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {lockReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                  {!canAccessLocked && (
                    <p className="mt-2 font-medium">
                      Contact a Administrator to access this task.
                    </p>
                  )}
                  {canAccessLocked && (
                    <p className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      You have administrative access to view this locked task.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Header */}
        <div
          className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6 ${
            isTaskLocked && !canAccessLocked
              ? "opacity-60 pointer-events-none"
              : ""
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <button
                  onClick={() => router.push(`/projects/${projectId}/tasks`)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {task.name}
                </h1>
                {task.is_milestone && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-xs rounded-full">
                    Milestone
                  </span>
                )}
                <span className={getPriorityBadge(task.priority)}>
                  {task.priority.toUpperCase()}
                </span>
                <div
                  className={`flex items-center space-x-1 ${getStatusBadge(
                    task.status
                  )}`}
                >
                  {getStatusIcon(task.status)}
                  <span>{task.status.replace("_", " ").toUpperCase()}</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {task.description}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setShowProgressModal(true)}
                disabled={isTaskLocked && !canAccessLocked}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} />
                <span>Update Task</span>
              </button>
            </div>
          </div>

          {/* Task Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Task Progress
                </span>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {task.progress_percentage}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${task.progress_percentage}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {fieldDataEntries.length > 0
                  ? "Updated based on resource assignments progress"
                  : "Based on planned progress"}
              </div>
            </div>

            {/* Cost Metrics */}
            {(() => {
              const plannedCost = task.budgets?.reduce(
                (total, budget) => total + (budget.planned_amount || 0),
                0
              ) || 0;

              const actualCost = task.budgets?.reduce(
                (total, budget) => total + (budget.actual_amount || 0),
                0
              ) || 0;

              const budgetVariance = actualCost - plannedCost;
              const isOverBudget = budgetVariance > 0;

              return (
                <div
                  className={`rounded-lg p-4 ${
                    isOverBudget
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-green-50 dark:bg-green-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        isOverBudget
                          ? "text-red-700 dark:text-red-300"
                          : "text-green-700 dark:text-green-300"
                      }`}
                    >
                      Cost Status
                    </span>
                    <Target
                      className={`w-5 h-5 ${
                        isOverBudget ? "text-red-500" : "text-green-500"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        Planned:
                      </span>
                      <span className="font-medium">
                        OMR {plannedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        Actual:
                      </span>
                      <span
                        className={`font-medium ${
                          isOverBudget ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        OMR {actualCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t">
                      <span className="text-gray-600 dark:text-gray-400">
                        Variance:
                      </span>
                      <span
                        className={`font-medium ${
                          isOverBudget ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isOverBudget ? "+" : ""} OMR {budgetVariance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      isOverBudget
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {isOverBudget
                      ? "Over budget - costs cascade up WBS hierarchy"
                      : "Within budget - costs tracked through WBS hierarchy"}
                  </div>
                </div>
              );
            })()}

            <div
              className={`rounded-lg p-4 ${
                overdue
                  ? "bg-red-50 dark:bg-red-900/20"
                  : "bg-green-50 dark:bg-green-900/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    overdue
                      ? "text-red-700 dark:text-red-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  Due Date
                </span>
                <Calendar
                  className={`w-5 h-5 ${
                    overdue ? "text-red-500" : "text-green-500"
                  }`}
                />
              </div>
              <p
                className={`text-sm font-medium ${
                  overdue
                    ? "text-red-900 dark:text-red-100"
                    : "text-green-900 dark:text-green-100"
                }`}
              >
                {new Date(task.end_date).toLocaleDateString()}
              </p>
              <p
                className={`text-xs ${
                  overdue
                    ? "text-red-600"
                    : daysUntilDue <= 3
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {overdue ? "Overdue" : `${daysUntilDue} days left`}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${
            isTaskLocked && !canAccessLocked
              ? "opacity-60 pointer-events-none"
              : ""
          }`}
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Timeline */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Timeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Start Date
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(task.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        overdue ? "bg-red-500" : "bg-blue-500"
                      }`}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        End Date
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(task.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Data Collection */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Field Data Collection
                </h3>
                <div className="flex items-center space-x-2">
                  {task.resource_assignments &&
                  task.resource_assignments.length > 0 ? (
                    <button
                      onClick={() => {
                        setEditingFieldData(null);
                        setShowFieldDataModal(true);
                      }}
                      disabled={isTaskLocked && !canAccessLocked}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      <span>Add Field Data</span>
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Assign resources to this task to collect field data
                    </p>
                  )}
                </div>
              </div>

              {/* Info box explaining field data behavior */}
              {task.resource_assignments &&
                task.resource_assignments.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-blue-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        <div className="font-medium mb-1">
                          Field Data Collection & Cost Tracking
                        </div>
                        <div>
                          Each field data entry represents{" "}
                          <strong>incremental progress</strong> that gets added
                          to the resource assignment totals. For example: if you
                          enter 10% progress and 5 hours, these values will be
                          added to the existing totals. The system automatically
                          calculates costs (hours × resource rate) and updates
                          budgets through the WBS hierarchy to the project
                          level.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {fieldDataEntries.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No field data collected yet
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {task.resource_assignments &&
                    task.resource_assignments.length > 0
                      ? "Collect actual progress data from assigned resources"
                      : "Assign resources to this task first, then collect field data"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fieldDataEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            +{entry.actual_progress}% progress • +
                            {entry.actual_hours}h worked
                          </span>
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            +$
                            {(
                              (entry.actual_hours || 0) *
                              (entry.resource_assignment?.resource?.rate || 0)
                            ).toFixed(2)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              entry.is_according_to_plan
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                            }`}
                          >
                            {entry.is_according_to_plan
                              ? "On Track"
                              : "Off Track"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Resource:{" "}
                          {entry.resource_assignment?.resource?.name ||
                            "Unknown"}{" "}
                          (
                          {entry.resource_assignment?.resource?.role ||
                            "Unknown Role"}
                          ) • ${entry.resource_assignment?.resource?.rate || 0}
                          /hr
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {entry.notes || "No notes provided"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Reported by {entry.reporter.first_name}{" "}
                          {entry.reporter.last_name} •{" "}
                          {new Date(entry.timestamp).toLocaleDateString()}{" "}
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingFieldData(entry);
                            setShowFieldDataModal(true);
                          }}
                          disabled={isTaskLocked && !canAccessLocked}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            isTaskLocked && !canAccessLocked
                              ? "Task is locked due to incomplete dependencies"
                              : "Edit field data entry"
                          }
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteFieldData(entry.id)}
                          disabled={isTaskLocked && !canAccessLocked}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            isTaskLocked && !canAccessLocked
                              ? "Task is locked due to incomplete dependencies"
                              : "Delete field data entry"
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Field Data Summary */}
              {fieldDataEntries.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Field Data Summary
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Total Field Entries
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {fieldDataEntries.length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Current Task Progress
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {task.progress_percentage}%
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        Total Cost Added
                      </p>
                      <p className="text-lg font-bold text-orange-600">
                        $
                        {fieldDataEntries
                          .reduce((total, entry) => {
                            const actualHours = entry.actual_hours || 0;
                            const rate =
                              entry.resource_assignment?.resource?.rate || 0;
                            return total + actualHours * rate;
                          }, 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    Task progress is automatically calculated based on resource
                    assignment progress, which is updated by field data entries.
                  </div>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Comments
              </h3>

              {/* Add Comment */}
              <div className="mb-6">
                <MentionTextarea
                  value={newComment}
                  onChange={setNewComment}
                  onSubmit={addComment}
                  placeholder="Add a comment... Type @ to mention team members"
                  projectId={projectId}
                  disabled={isAddingComment}
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingComment && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    <MessageSquare size={16} />
                    <span>Add Comment</span>
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No comments yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentThread
                      key={comment.comment_id}
                      comment={comment}
                      onReply={handleReplyClick}
                      replyingTo={replyingTo}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onAddReply={addReply}
                      onCancelReply={cancelReply}
                      isAddingReply={isAddingReply}
                      projectId={projectId}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Resources */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Assigned Resources
                </h3>
                <button
                  onClick={() => setShowResourceModal(true)}
                  disabled={isTaskLocked && !canAccessLocked}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <User size={14} />
                  <span>Assign</span>
                </button>
              </div>

              {/* Auto timesheet info */}
              <div className="space-y-3">
                {task.resource_assignments &&
                task.resource_assignments.length > 0 ? (
                  task.resource_assignments.map((assignment, index) => {
                    const isResourceCompleted =
                      (assignment as any).progress >= 100;
                    const completionPercentage =
                      (assignment as any).progress || 0;

                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between border rounded-lg p-2 transition-colors ${
                          isResourceCompleted
                            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-slate-700"
                        }`}
                      >
                        <div
                          className={`flex items-center space-x-3 flex-1 rounded-lg p-2 transition-colors ${
                            isTaskLocked && !canAccessLocked
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                          }`}
                          onClick={() => {
                            if (!(isTaskLocked && !canAccessLocked)) {
                              setSelectedAssignment(assignment);
                              setShowEditModal(true);
                            }
                          }}
                          title={
                            isTaskLocked && !canAccessLocked
                              ? "Task is locked due to incomplete dependencies"
                              : "Click to edit assignment"
                          }
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isResourceCompleted
                                ? "bg-green-100 dark:bg-green-900"
                                : "bg-blue-100 dark:bg-blue-900"
                            }`}
                          >
                            {isResourceCompleted ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <span className="text-sm font-medium text-blue-600">
                                {`${assignment.resource?.name || "Unknown"}`
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-sm font-medium ${
                                  isResourceCompleted
                                    ? "text-green-900 dark:text-green-100"
                                    : "text-gray-900 dark:text-gray-100"
                                }`}
                              >
                                {`${
                                  assignment.resource?.name ||
                                  "Unknown Resource"
                                }`}
                              </span>
                              {isResourceCompleted && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full font-medium">
                                  Completed
                                </span>
                              )}
                              <Edit size={12} className="text-gray-400" />
                            </div>
                            <div
                              className={`text-xs space-y-1 ${
                                isResourceCompleted
                                  ? "text-green-700 dark:text-green-300"
                                  : "text-gray-500"
                              }`}
                            >
                              <div>
                                {assignment.resource?.role || "Unknown Role"} •{" "}
                                {assignment.allocation_percentage || 0}%
                                allocated • {completionPercentage}% progress
                              </div>
                              <div>
                                Hours: {assignment.actual_hours || 0}h/
                                {assignment.planned_hours || 0}h • Cost: $
                                {(
                                  (assignment.actual_hours || 0) *
                                  (assignment.resource?.rate || 0)
                                ).toFixed(2)}
                                /$
                                {(
                                  (assignment.planned_hours || 0) *
                                  (assignment.resource?.rate || 0)
                                ).toFixed(2)}
                              </div>
                              {(assignment.actual_hours || 0) >
                                (assignment.planned_hours || 0) && (
                                <div className="text-orange-600 dark:text-orange-400 font-medium">
                                  Over planned by{" "}
                                  {(
                                    (assignment.actual_hours || 0) -
                                    (assignment.planned_hours || 0)
                                  ).toFixed(1)}
                                  h (+$
                                  {(
                                    ((assignment.actual_hours || 0) -
                                      (assignment.planned_hours || 0)) *
                                    (assignment.resource?.rate || 0)
                                  ).toFixed(2)}
                                  )
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnassignResource(assignment.assignment_id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                          title="Remove assignment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                    <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      No resources assigned
                    </p>
                    <button
                      onClick={() => setShowResourceModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Assign the first resource
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Task Documents */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Documents
                </h3>
                <label
                  className={`flex items-center space-x-2 px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer ${
                    isTaskLocked && !canAccessLocked
                      ? "opacity-50 cursor-not-allowed pointer-events-none"
                      : ""
                  }`}
                >
                  <Upload size={14} />
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => handleFileSelect(e.target.files, e.target)}
                    className="hidden"
                    disabled={isTaskLocked && !canAccessLocked}
                  />
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No documents
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-slate-700 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {getFileIcon(doc.name)}
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          className="p-1 text-gray-400 hover:text-blue-600"
                          onClick={() => handleViewDocument(doc)}
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-green-600"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Download document"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={isTaskLocked && !canAccessLocked}
                          title={
                            isTaskLocked && !canAccessLocked
                              ? "Task is locked due to incomplete dependencies"
                              : "Delete document"
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Update Modal */}
        {showProgressModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => setShowProgressModal(false)}
          >
            <div
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isDarkMode
                  ? "1px solid rgba(148, 163, 184, 0.2)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Update Task
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.name}
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = Object.fromEntries(formData.entries());
                  submitProgressUpdate(data);
                }}
                className="space-y-4"
              >
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Update Task Status
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You can update the task status and priority. Progress
                    tracking is handled automatically through resource
                    assignments and field data.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    required
                    defaultValue={task.status}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    required
                    defaultValue={task.priority}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowProgressModal(false)}
                    disabled={isUpdatingProgress}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProgress}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isUpdatingProgress && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    <Save size={16} />
                    <span>
                      {isUpdatingProgress ? "Updating..." : "Update Task"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Time Log Modal */}
        {showTimeLogModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => setShowTimeLogModal(false)}
          >
            <div
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isDarkMode
                  ? "1px solid rgba(148, 163, 184, 0.2)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Log Time
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track time spent on this task
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = Object.fromEntries(formData.entries());
                  submitTimeLog(data);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hours Worked
                  </label>
                  <input
                    name="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    placeholder="8.0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="What did you work on?"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowTimeLogModal(false)}
                    disabled={isLoggingTime}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingTime}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isLoggingTime && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    <Clock size={16} />
                    <span>{isLoggingTime ? "Logging..." : "Log Time"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Resource Assignment Modal */}
        {showResourceModal && task && (
          <ResourceAssignmentModal
            task={{
              ...task,
              description: task.description || null,
              wbs_id: task.wbs_id || 0,
              actual_start_date: task.actual_start_date || null,
              actual_end_date: task.actual_end_date || null,
              duration: task.duration || 0,
              is_critical_path: task.is_critical_path || false,
              created_at: task.created_at || new Date().toISOString(),
              updated_at: task.updated_at || new Date().toISOString(),
              work_package: task.work_package || null,
              wbs: task.wbs || {
                wbs_id: 0,
                name: "Default WBS",
                wbs_code: "WBS-001",
                level: 1,
              },
            }}
            resources={allResources}
            existingAssignments={task.resource_assignments || []}
            onClose={() => setShowResourceModal(false)}
            onSave={handleResourceAssign}
          />
        )}

        {/* Edit Assignment Modal */}
        {showEditModal && task && selectedAssignment && (
          <EditAssignmentModal
            assignment={selectedAssignment}
            resources={allResources}
            task={task}
            existingAssignments={task.resource_assignments || []}
            onClose={() => {
              setShowEditModal(false);
              setSelectedAssignment(null);
            }}
            onSave={handleEditAssignment}
          />
        )}

        {/* Upload Document Modal */}
        {showUploadModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => setShowUploadModal(false)}
          >
            <div
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isDarkMode
                  ? "1px solid rgba(148, 163, 184, 0.2)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mr-4">
                  <Upload className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Upload Document
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload files to this task
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Selected Files */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Files ({uploadFiles.length})
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add a description for these documents..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700 mt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setUploadDescription("");
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={isUploading || uploadFiles.length === 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isUploading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  )}
                  <Upload size={16} />
                  <span>
                    {isUploading
                      ? "Uploading..."
                      : `Upload ${uploadFiles.length} File${
                          uploadFiles.length !== 1 ? "s" : ""
                        }`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Document Confirmation Modal */}
        {showDeleteDocumentModal && documentToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => setShowDeleteDocumentModal(false)}
          >
            <div
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isDarkMode
                  ? "1px solid rgba(148, 163, 184, 0.2)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Delete Document
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete the following document?
                </p>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
                      {getFileIcon(documentToDelete.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100 truncate">
                        {documentToDelete.name}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {formatFileSize(documentToDelete.size)} • Uploaded{" "}
                        {new Date(
                          documentToDelete.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-3 font-medium">
                  ⚠️ This document will be permanently deleted and cannot be
                  recovered.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowDeleteDocumentModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Delete Document</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Field Data Modal */}
        {showFieldDataModal && task && (
          <FieldDataModal
            task={task}
            editingEntry={editingFieldData}
            onClose={() => {
              setShowFieldDataModal(false);
              setEditingFieldData(null);
            }}
            onSave={
              editingFieldData ? handleUpdateFieldData : handleCreateFieldData
            }
            isSubmitting={isSubmittingFieldData}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default TaskDetailsPage;
