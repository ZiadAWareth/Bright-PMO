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
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";

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


  const [progressStatus, setProgressStatus] = React.useState("");
  const [progressPriority, setProgressPriority] = React.useState("");
  React.useEffect(() => {
    if (showProgressModal && task) {
      setProgressStatus(task.status ?? "");
      setProgressPriority(task.priority ?? "");
    }
  }, [showProgressModal, task]);

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
            <Spinner size={48} className="text-bright-primary" />
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
            <h3 className="text-lg font-medium text-ink mb-2">
              Task not found
            </h3>
            <p className="text-muted mb-4">
              The task you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
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
            <div className="w-16 h-16 bg-danger-soft rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <h3 className="text-lg font-medium text-ink mb-2">
              Access Denied
            </h3>
            <p className="text-muted mb-4">
              You don't have permission to view the details of this task. Only
              Project Managers (PJM), PMO, Administrators, and users assigned to
              this task can access task details.
            </p>
            <p className="text-sm text-faint mb-6">
              Your current role:{" "}
              <span className="font-medium">{userRole || "Unknown"}</span>
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => router.push(`/projects/${projectId}/tasks`)}
                className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Back to Tasks
              </button>
              <button
                onClick={() => router.push(`/projects/${projectId}`)}
                className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
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
            <Spinner size={48} className="text-bright-primary" />
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
        <div className="flex items-center space-x-2 text-sm text-muted mb-6">
          <button
            onClick={() => router.push("/projects")}
            className="hover:text-bright transition-colors"
          >
            Projects
          </button>
          <span>/</span>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="hover:text-bright transition-colors"
          >
            {projectName}
          </button>
          <span>/</span>
          <button
            onClick={() => router.push(`/projects/${projectId}/tasks`)}
            className="hover:text-bright transition-colors"
          >
            Tasks
          </button>
          <span>/</span>
          <span className="text-ink">{task.name}</span>
        </div>

        {/* Task Dependency Warning */}
        {isTaskLocked && (
          <div className="bg-warning-soft border border-warning rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-warning font-medium mb-2">
                  Task Access Restricted
                </h3>
                <div className="text-warning text-sm space-y-1">
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
                    <p className="mt-2 text-warning font-medium">
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
          className={`bg-surface border border-line rounded-xl p-6 mb-6 ${
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
                  className="p-2 rounded-lg text-faint hover:text-muted hover:bg-surface-2 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-ink">
                  {task.name}
                </h1>
                {task.is_milestone && (
                  <span className="px-2 py-1 bg-accent-violet-soft text-accent-violet text-xs rounded-full">
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
              <p className="text-muted mb-4">
                {task.description}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setShowProgressModal(true)}
                disabled={isTaskLocked && !canAccessLocked}
                className="flex items-center space-x-1 px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} />
                <span>Update Task</span>
              </button>
            </div>
          </div>

          {/* Task Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-info-soft rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-info">
                  Task Progress
                </span>
                <span className="text-lg font-bold text-info">
                  {task.progress_percentage}%
                </span>
              </div>
              <div className="w-full bg-info-soft rounded-full h-2">
                <div
                  className="bg-info h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${task.progress_percentage}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-info mt-1">
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
                      ? "bg-danger-soft"
                      : "bg-success-soft"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium ${
                        isOverBudget
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      Cost Status
                    </span>
                    <Target
                      className={`w-5 h-5 ${
                        isOverBudget ? "text-danger" : "text-success"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">
                        Planned:
                      </span>
                      <span className="font-medium">
                        OMR {plannedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">
                        Actual:
                      </span>
                      <span
                        className={`font-medium ${
                          isOverBudget ? "text-danger" : "text-success"
                        }`}
                      >
                        OMR {actualCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t">
                      <span className="text-muted">
                        Variance:
                      </span>
                      <span
                        className={`font-medium ${
                          isOverBudget ? "text-danger" : "text-success"
                        }`}
                      >
                        {isOverBudget ? "+" : ""} OMR {budgetVariance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      isOverBudget
                        ? "text-danger"
                        : "text-success"
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
                  ? "bg-danger-soft"
                  : "bg-success-soft"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    overdue
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  Due Date
                </span>
                <Calendar
                  className={`w-5 h-5 ${
                    overdue ? "text-danger" : "text-success"
                  }`}
                />
              </div>
              <p
                className={`text-sm font-medium ${
                  overdue
                    ? "text-danger "
                    : "text-success "
                }`}
              >
                {new Date(task.end_date).toLocaleDateString()}
              </p>
              <p
                className={`text-xs ${
                  overdue
                    ? "text-danger"
                    : daysUntilDue <= 3
                    ? "text-bright"
                    : "text-success"
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
            <div className="bg-surface border border-line rounded-xl p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">
                Timeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <div>
                      <p className="font-medium text-ink">
                        Start Date
                      </p>
                      <p className="text-sm text-muted">
                        {new Date(task.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        overdue ? "bg-danger" : "bg-info"
                      }`}
                    ></div>
                    <div>
                      <p className="font-medium text-ink">
                        End Date
                      </p>
                      <p className="text-sm text-muted">
                        {new Date(task.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Data Collection */}
            <div className="bg-surface border border-line rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink">
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
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-success text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                      <span>Add Field Data</span>
                    </button>
                  ) : (
                    <p className="text-sm text-muted italic">
                      Assign resources to this task to collect field data
                    </p>
                  )}
                </div>
              </div>

              {/* Info box explaining field data behavior */}
              {task.resource_assignments &&
                task.resource_assignments.length > 0 && (
                  <div className="mb-4 p-3 bg-info-soft border border-info rounded-lg">
                    <div className="flex items-start space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-info mt-0.5"
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
                      <div className="text-xs text-info">
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
                <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                  <Target className="w-12 h-12 text-faint mx-auto mb-3" />
                  <p className="text-muted">
                    No field data collected yet
                  </p>
                  <p className="text-sm text-muted mt-2">
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
                      className="flex items-center justify-between p-3 border border-line rounded-lg hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-medium text-ink">
                            +{entry.actual_progress}% progress • +
                            {entry.actual_hours}h worked
                          </span>
                          <span className="text-sm text-success font-medium">
                            +$
                            {(
                              (entry.actual_hours || 0) *
                              (entry.resource_assignment?.resource?.rate || 0)
                            ).toFixed(2)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              entry.is_according_to_plan
                                ? "bg-success-soft text-success  "
                                : "bg-bright-soft text-bright  "
                            }`}
                          >
                            {entry.is_according_to_plan
                              ? "On Track"
                              : "Off Track"}
                          </span>
                        </div>
                        <p className="text-sm text-muted mb-1">
                          Resource:{" "}
                          {entry.resource_assignment?.resource?.name ||
                            "Unknown"}{" "}
                          (
                          {entry.resource_assignment?.resource?.role ||
                            "Unknown Role"}
                          ) • ${entry.resource_assignment?.resource?.rate || 0}
                          /hr
                        </p>
                        <p className="text-sm text-muted mb-1">
                          {entry.notes || "No notes provided"}
                        </p>
                        <p className="text-xs text-muted">
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
                          className="p-1 text-faint hover:text-info transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="p-1 text-faint hover:text-danger transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="mt-6 pt-4 border-t border-line">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-ink">
                      Field Data Summary
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-info-soft rounded-lg">
                      <p className="text-sm font-medium text-info">
                        Total Field Entries
                      </p>
                      <p className="text-lg font-bold text-info">
                        {fieldDataEntries.length}
                      </p>
                    </div>
                    <div className="p-3 bg-success-soft rounded-lg">
                      <p className="text-sm font-medium text-success">
                        Current Task Progress
                      </p>
                      <p className="text-lg font-bold text-success">
                        {task.progress_percentage}%
                      </p>
                    </div>
                    <div className="p-3 bg-bright-soft rounded-lg">
                      <p className="text-sm font-medium text-bright">
                        Total Cost Added
                      </p>
                      <p className="text-lg font-bold text-bright">
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
                  <div className="mt-3 text-xs text-muted">
                    Task progress is automatically calculated based on resource
                    assignment progress, which is updated by field data entries.
                  </div>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-surface border border-line rounded-xl p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">
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
                    className="flex items-center space-x-2 px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingComment && (
                      <Spinner size={16} />
                    )}
                    <MessageSquare size={16} />
                    <span>Add Comment</span>
                  </button>
                </div>
              </div>

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                  <MessageSquare className="w-12 h-12 text-faint mx-auto mb-3" />
                  <p className="text-muted">
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
            <div className="bg-surface border border-line rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink">
                  Assigned Resources
                </h3>
                <button
                  onClick={() => setShowResourceModal(true)}
                  disabled={isTaskLocked && !canAccessLocked}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            ? "border-success bg-success-soft  "
                            : "border-line"
                        }`}
                      >
                        <div
                          className={`flex items-center space-x-3 flex-1 rounded-lg p-2 transition-colors ${
                            isTaskLocked && !canAccessLocked
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer hover:bg-surface-2"
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
                                ? "bg-success-soft"
                                : "bg-info-soft"
                            }`}
                          >
                            {isResourceCompleted ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <span className="text-sm font-medium text-info">
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
                                    ? "text-success "
                                    : "text-ink"
                                }`}
                              >
                                {`${
                                  assignment.resource?.name ||
                                  "Unknown Resource"
                                }`}
                              </span>
                              {isResourceCompleted && (
                                <span className="px-2 py-1 bg-success-soft text-success text-xs rounded-full font-medium">
                                  Completed
                                </span>
                              )}
                              <Edit size={12} className="text-faint" />
                            </div>
                            <div
                              className={`text-xs space-y-1 ${
                                isResourceCompleted
                                  ? "text-success"
                                  : "text-muted"
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
                                <div className="text-bright font-medium">
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
                          className="p-1 text-faint hover:text-danger transition-colors rounded"
                          title="Remove assignment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-line rounded-lg">
                    <User className="w-8 h-8 text-faint mx-auto mb-2" />
                    <p className="text-muted mb-3">
                      No resources assigned
                    </p>
                    <button
                      onClick={() => setShowResourceModal(true)}
                      className="text-sm text-info hover:text-info font-medium"
                    >
                      Assign the first resource
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Task Documents */}
            <div className="bg-surface border border-line rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ink">
                  Documents
                </h3>
                <label
                  className={`flex items-center space-x-2 px-3 py-1 text-sm bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors cursor-pointer ${
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
                <div className="text-center py-6 border-2 border-dashed border-line rounded-lg">
                  <FileText className="w-8 h-8 text-faint mx-auto mb-2" />
                  <p className="text-sm text-muted">
                    No documents
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="flex items-center justify-between p-2 border border-line rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {getFileIcon(doc.name)}
                        <span className="text-sm text-ink">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          className="p-1 text-faint hover:text-info"
                          onClick={() => handleViewDocument(doc)}
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="p-1 text-faint hover:text-success"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Download document"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="p-1 text-faint hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-info-soft rounded-full flex items-center justify-center mr-4">
                  <RefreshCw className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Update Task
                  </h3>
                  <p className="text-sm text-muted">
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
                <div className="p-4 bg-info-soft border border-info rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-info" />
                    <span className="font-medium text-info">
                      Update Task Status
                    </span>
                  </div>
                  <p className="text-sm text-info">
                    You can update the task status and priority. Progress
                    tracking is handled automatically through resource
                    assignments and field data.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-1">
                    Status
                  </label>
                  <Dropdown
                    name="status"
                    required
                    value={progressStatus}
                    onChange={setProgressStatus}
                    ariaLabel="Status"
                    modal
                    options={[
                      { value: "todo", label: "To Do" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "completed", label: "Completed" },
                      { value: "on_hold", label: "On Hold" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-1">
                    Priority
                  </label>
                  <Dropdown
                    name="priority"
                    required
                    value={progressPriority}
                    onChange={setProgressPriority}
                    ariaLabel="Priority"
                    modal
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                    ]}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowProgressModal(false)}
                    disabled={isUpdatingProgress}
                    className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingProgress}
                    className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isUpdatingProgress && (
                      <Spinner size={16} />
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
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mr-4">
                  <Clock className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Log Time
                  </h3>
                  <p className="text-sm text-muted">
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
                  <label className="block text-sm font-medium text-ink-3 mb-1">
                    Hours Worked
                  </label>
                  <input
                    name="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    placeholder="8.0"
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-success focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-1">
                    Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-success focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="What did you work on?"
                    required
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-success focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setShowTimeLogModal(false)}
                    disabled={isLoggingTime}
                    className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingTime}
                    className="px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isLoggingTime && (
                      <Spinner size={16} />
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
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-bright-soft rounded-full flex items-center justify-center mr-4">
                  <Upload className="w-6 h-6 text-bright" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Upload Document
                  </h3>
                  <p className="text-sm text-muted">
                    Upload files to this task
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Selected Files */}
                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-2">
                    Selected Files ({uploadFiles.length})
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-2 bg-surface-2 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-info-soft rounded flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add a description for these documents..."
                    rows={2}
                    className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-line mt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setUploadDescription("");
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={isUploading || uploadFiles.length === 0}
                  className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isUploading && (
                    <Spinner size={16} />
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
              className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-danger-soft rounded-full flex items-center justify-center mr-4">
                  <Trash2 className="w-6 h-6 text-danger" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Delete Document
                  </h3>
                  <p className="text-sm text-muted">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-ink-3 mb-3">
                  Are you sure you want to delete the following document?
                </p>
                <div className="p-3 bg-danger-soft border border-danger rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-danger-soft rounded flex items-center justify-center">
                      {getFileIcon(documentToDelete.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-danger truncate">
                        {documentToDelete.name}
                      </p>
                      <p className="text-xs text-danger">
                        {formatFileSize(documentToDelete.size)} • Uploaded{" "}
                        {new Date(
                          documentToDelete.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-danger mt-3 font-medium">
                  ⚠️ This document will be permanently deleted and cannot be
                  recovered.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                <button
                  onClick={() => {
                    setShowDeleteDocumentModal(false);
                  }}
                  className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDocument}
                  className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-colors flex items-center space-x-2"
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
