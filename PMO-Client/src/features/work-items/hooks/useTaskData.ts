"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notConnected } from "@/lib/not-connected";
import type { Task, TimeLog, FieldDataEntry, Comment, Document } from "../components/details/types";

/**
 * View model for the task details page: UI state, data and handlers.
 *
 * notConnected: the task, its project name, comments, documents, time logs,
 * field data, resources and team members would be loaded from the backend,
 * and every handler below that saves something would call it. Until then the
 * data is empty (no task, so the page shows its empty state) and those
 * handlers report that they are not connected. Access is fully open until
 * roles come from the backend. UI-only handlers work as before.
 */
export function useTaskData(params: Promise<{ id: string; taskId: string }>) {
  const router = useRouter();
  const [activeView, setActiveView] = useState("technical");
  const loading = false;
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [task, setTask] = useState<Task | null>(null);
  const [projectName] = useState<string>("");
  const [currentUserId] = useState<number | null>(null);

  // Modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const isUpdatingProgress = false;
  const isLoggingTime = false;

  // Document upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDescription, setUploadDescription] = useState("");
  const isUploading = false;

  // Comments and documents
  const [comments] = useState<Comment[]>([]);
  const [documents] = useState<Document[]>([]);
  const [timeLogs] = useState<TimeLog[]>([]);
  const [newComment, setNewComment] = useState("");
  const isAddingComment = false;
  const [currentUserName] = useState<string>("");

  // Reply states
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const isAddingReply = false;

  // Field data collection
  const [fieldDataEntries] = useState<FieldDataEntry[]>([]);
  const [showFieldDataModal, setShowFieldDataModal] = useState(false);
  const [editingFieldData, setEditingFieldData] =
    useState<FieldDataEntry | null>(null);
  const isSubmittingFieldData = false;

  // Resources and team members
  const [availableResources] = useState<Array<{ value: string; label: string }>>([]);
  const [allResources] = useState<any[]>([]);
  const [projectTeamMembers] = useState<any[]>([]);

  // Access: fully open until roles come from the backend.
  const [userRole] = useState<string | null>(null);
  const isTaskLocked = false;
  const [lockReasons] = useState<string[]>([]);
  const canAccessLocked = true;
  const hasTaskAccess: boolean | null = true;

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setProjectId(resolvedParams.id);
      setTaskId(resolvedParams.taskId);
    };
    getParams();
  }, [params]);

  // --- Handler Functions ---

  const submitProgressUpdate = async (_data: Record<string, any>) =>
    notConnected("Updating progress");

  const submitTimeLog = async (_data: Record<string, any>) =>
    notConnected("Logging time");

  const handleCreateFieldData = async (_data: any) =>
    notConnected("Adding field data");

  const handleUpdateFieldData = async (_data: any) =>
    notConnected("Updating field data");

  const handleDeleteFieldData = async (_fieldDataId: number) =>
    notConnected("Deleting field data");

  const handleResourceAssign = async (_data: any) =>
    notConnected("Assigning a resource");

  const handleUnassignResource = async (_assignmentId: number) =>
    notConnected("Unassigning a resource");

  const handleEditAssignment = async (_updatedAssignment: any) =>
    notConnected("Updating the assignment");

  const handleTaskStatusUpdateFromModal = async (
    _modalTaskId: string,
    _newStatus: string
  ) => notConnected("Changing the task status");

  const addComment = async () => {
    if (!newComment.trim()) return;
    notConnected("Adding a comment");
  };

  const addReply = async (_parentId: number) => {
    if (!replyText.trim()) return;
    notConnected("Replying to a comment");
  };

  const handleReplyClick = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyText("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const handleFileSelect = (
    files: FileList | null,
    inputElement?: HTMLInputElement
  ) => {
    if (files && files.length > 0) {
      setUploadFiles(Array.from(files));
      setShowUploadModal(true);

      if (inputElement) {
        inputElement.value = "";
      }
    }
  };

  const handleUploadDocument = async () => {
    if (uploadFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }
    notConnected("Uploading documents");
  };

  const handleViewDocument = (_doc: Document) => notConnected("Opening a document");

  const handleDownloadDocument = async (_doc: Document) =>
    notConnected("Downloading a document");

  const handleDeleteDocument = (doc: Document) => {
    setDocumentToDelete(doc);
    setShowDeleteDocumentModal(true);
  };

  const confirmDeleteDocument = async () => {
    setShowDeleteDocumentModal(false);
    setDocumentToDelete(null);
    notConnected("Deleting a document");
  };

  return {
    router,
    activeView, setActiveView,
    loading,
    projectId,
    taskId,
    task, setTask,
    projectName,
    currentUserId,
    showProgressModal, setShowProgressModal,
    showTimeLogModal, setShowTimeLogModal,
    showResourceModal, setShowResourceModal,
    showEditModal, setShowEditModal,
    showDeleteDocumentModal, setShowDeleteDocumentModal,
    selectedAssignment, setSelectedAssignment,
    documentToDelete, setDocumentToDelete,
    isUpdatingProgress,
    isLoggingTime,
    showUploadModal, setShowUploadModal,
    uploadFiles, setUploadFiles,
    uploadDescription, setUploadDescription,
    isUploading,
    comments,
    documents,
    timeLogs,
    newComment, setNewComment,
    isAddingComment,
    currentUserName,
    replyingTo,
    replyText, setReplyText,
    isAddingReply,
    fieldDataEntries,
    showFieldDataModal, setShowFieldDataModal,
    editingFieldData, setEditingFieldData,
    isSubmittingFieldData,
    availableResources,
    allResources,
    projectTeamMembers,
    userRole,
    isTaskLocked,
    lockReasons,
    canAccessLocked,
    hasTaskAccess,
    // Handler functions
    submitProgressUpdate,
    submitTimeLog,
    handleCreateFieldData,
    handleUpdateFieldData,
    handleDeleteFieldData,
    handleResourceAssign,
    handleUnassignResource,
    handleEditAssignment,
    handleTaskStatusUpdateFromModal,
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
  };
}
