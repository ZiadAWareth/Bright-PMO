"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ProjectWithRelations } from "@/features/projects/types";
import { ProjectApproval, BOMData } from "../components/details/types";
import { notConnected } from "@/lib/not-connected";

/**
 * View model for the project details page: UI state, data and handlers.
 *
 * notConnected: the project, its tasks, risks, procurements, approvals, team
 * candidates and managers would be loaded from the backend, and every handler
 * below that saves something would call it. Until then the data is empty (no
 * project, so the page shows its empty state) and those handlers report that
 * they are not connected. UI-only handlers (opening modals, picking files)
 * work as before.
 */
export function useProjectData(params: Promise<{ id: string }>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Every view is open until roles come from the backend; "admin" shows all.
    const [activeView, setActiveView] = useState<string | null>("admin");
    const [activeTab, setActiveTab] = useState("overview");
    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const loading = false;
    const [isStarred, setIsStarred] = useState(false);
    const [projectId, setProjectId] = useState<string>("");
    const [isAddTeamMemberModalOpen, setIsAddTeamMemberModalOpen] =
        useState(false);
    const [availableUsers] = useState<Array<{ value: string; label: string }>>([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const isDeleting = false;
    const [showArchiveConfirmation, setShowArchiveConfirmation] =
        useState(false);
    const isArchiving = false;
    const [showChangeManagerModal, setShowChangeManagerModal] = useState(false);
    const isChangingManager = false;
    const [availableManagers] = useState<
        Array<{
            user_id: number;
            account: { first_name: string; last_name: string };
            email: string;
            role?: { name?: string };
        }>
    >([]);
    const [selectedManagerId, setSelectedManagerId] = useState<string>("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
    const [selectedTeamMember, setSelectedTeamMember] = useState<number | null>(
        null
    );
    const [assignFormData, setAssignFormData] = useState({
        user_id: "",
        task_id: "",
    });
    const [currentUserId] = useState<number | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadLocation, setUploadLocation] = useState<{
        type: "project" | "wbs" | "task";
        id?: string;
    }>({ type: "project" });
    const [uploadDescription, setUploadDescription] = useState("");
    const [showDeleteDocumentModal, setShowDeleteDocumentModal] =
        useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<any>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const isExporting = false;
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressUpdateTarget, setProgressUpdateTarget] = useState<{
        type: "project" | "task";
        id?: number;
        name: string;
    } | null>(null);
    const isUpdatingProgress = false;
    const [userTasks] = useState<any[]>([]);
    const [risks] = useState<any[]>([]);
    const [procurements, setProcurements] = useState<any[]>([]);
    const [projectApprovals] = useState<ProjectApproval[]>([]);
    const [userApproval] = useState<ProjectApproval | null>(null);
    const isUpdatingApproval = false;
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showBudgetChangeModal, setShowBudgetChangeModal] = useState(false);
    const [showBudgetWorkflowModal, setShowBudgetWorkflowModal] = useState(false);
    const [activeBudgetApproval, setActiveBudgetApproval] = useState<ProjectApproval[]>([]);
    const isStartingClosure = false;
    const [showBOMModal, setShowBOMModal] = useState(false);
    const [bomData] = useState<BOMData | null>(null);
    const isGeneratingBOM = false;

    // --- Handlers ---

    const handleHealthScoreUpdate = (newHealthScore: number) => {
        if (project) {
            setProject({
                ...project,
                healthScore: newHealthScore,
            });
        }
    };

    const startClosureProcess = () => notConnected("Starting project closure");

    const calculateProjectHealth = useCallback(
        (_pid: string) => notConnected("Calculating project health"),
        []
    );

    const refreshProjectAndApprovals = useCallback(() => {
        // notConnected: reloads the project and its approvals.
    }, []);

    const generateBOM = () => notConnected("Generating the bill of materials");

    const handleAddTeamMember = (_data: Record<string, any>) =>
        notConnected("Adding a team member");

    const handleDeleteTeamMember = (_userId: number) =>
        notConnected("Removing a team member");

    const handleDeleteProject = () => {
        setShowDeleteConfirmation(false);
        notConnected("Deleting the project");
    };

    const handleArchiveProject = () => {
        setShowArchiveConfirmation(false);
        notConnected("Archiving the project");
    };

    const handleChangeManager = () => {
        if (!selectedManagerId) {
            toast.error("Please select a new manager");
            return;
        }
        notConnected("Changing the project manager");
    };

    const handleEditSuccess = () => {
        setShowEditModal(false);
        // notConnected: reloads the edited project.
    };

    const handleAssignToTask = (_data: { user_id: string; task_id: string }) =>
        notConnected("Assigning to a task");

    const handleAssignTeamMemberToTask = (userId: number) => {
        setSelectedTeamMember(userId);
        setAssignFormData({ user_id: userId.toString(), task_id: "" });
        setShowAssignTaskModal(true);
    };

    const handleOpenProgressModal = (
        type: "project" | "task",
        id?: number,
        name?: string
    ) => {
        setProgressUpdateTarget({
            type,
            id,
            name:
                name ||
                (type === "project" ? project?.name || "Project" : "Task"),
        });
        setShowProgressModal(true);
    };

    const handleActionClick = (action: string) => {
        switch (action) {
            case "edit":
                router.push(`/projects/${projectId}/edit`);
                break;
            case "generate_bom":
                generateBOM();
                break;
            case "delete":
                setShowDeleteConfirmation(true);
                break;
            case "archive":
                setShowArchiveConfirmation(true);
                break;
            case "change_manager":
                setSelectedManagerId("");
                setShowChangeManagerModal(true);
                break;
            case "add_member":
                setIsAddTeamMemberModalOpen(true);
                break;
            case "assign_task":
                setSelectedTeamMember(null);
                setAssignFormData({ user_id: "", task_id: "" });
                setShowAssignTaskModal(true);
                break;
            case "update_progress":
                handleOpenProgressModal("project");
                break;
            case "upload_doc": {
                const fileInput = document.getElementById(
                    "upload-doc-input"
                ) as HTMLInputElement;
                if (fileInput) {
                    fileInput.click();
                }
                break;
            }
            default:
                break;
        }
    };

    const handleFileUpload = (
        _files: File[],
        _uploadLoc?: { type: "project" | "wbs" | "task"; id?: string },
        _description?: string
    ) => notConnected("Uploading documents");

    const handleDownloadDocument = (_doc: any) =>
        notConnected("Downloading a document");

    const handleViewDocument = (_doc: any) => notConnected("Opening a document");

    const handleDeleteDocument = (doc: any) => {
        setDocumentToDelete(doc);
        setShowDeleteDocumentModal(true);
    };

    const confirmDeleteDocument = () => {
        setShowDeleteDocumentModal(false);
        setDocumentToDelete(null);
        notConnected("Deleting a document");
    };

    const handleUploadModalSubmit = () => {
        if (uploadFiles.length === 0) {
            toast.error("Please select files to upload");
            return;
        }
        handleFileUpload(uploadFiles, uploadLocation, uploadDescription);
    };

    const handleFileSelect = (
        files: FileList | null,
        inputElement?: HTMLInputElement
    ) => {
        if (files && files.length > 0) {
            setUploadFiles(Array.from(files));
            setShowUploadModal(true);
        }
        if (inputElement) {
            inputElement.value = "";
        }
    };

    const handleExportAllDocuments = () =>
        notConnected("Exporting documents");

    const handleUpdateProgress = (_data: Record<string, any>) =>
        notConnected("Updating progress");

    const handleApproveProject = () => notConnected("Approving the project");

    const handleRejectProject = () => notConnected("Rejecting the project");

    // risks are reloaded through this after a change on the risk tab.
    const fetchRisks = () => {
        // notConnected: loads the project's risks.
    };

    // --- Effects ---

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    useEffect(() => {
        if (activeView === "technical") {
            setActiveTab("my-tasks");
        } else if (activeView === "fin") {
            setActiveTab("my-tasks");
        } else if (activeView === "procurement") {
            setActiveTab("my-tasks");
        } else {
            setActiveTab("overview");
        }
    }, [activeView]);

    useEffect(() => {
        const budgetApprovals = projectApprovals.filter(
            (a: any) =>
                a.type === "BUDGET_CHANGE" &&
                !["APPROVED", "REJECTED"].includes(a.status)
        );
        setActiveBudgetApproval(budgetApprovals);
    }, [projectApprovals]);

    return {
        // Navigation
        router,
        searchParams,

        // Core state
        activeView,
        setActiveView,
        activeTab,
        setActiveTab,
        project,
        setProject,
        loading,
        projectId,
        currentUserId,

        // UI flags
        isStarred,
        setIsStarred,

        // Team member modal
        isAddTeamMemberModalOpen,
        setIsAddTeamMemberModalOpen,
        availableUsers,

        // Delete confirmation
        showDeleteConfirmation,
        setShowDeleteConfirmation,
        isDeleting,

        // Archive confirmation
        showArchiveConfirmation,
        setShowArchiveConfirmation,
        isArchiving,

        // Change manager modal
        showChangeManagerModal,
        setShowChangeManagerModal,
        isChangingManager,
        availableManagers,
        selectedManagerId,
        setSelectedManagerId,

        // Edit modal
        showEditModal,
        setShowEditModal,

        // Assign task modal
        showAssignTaskModal,
        setShowAssignTaskModal,
        selectedTeamMember,
        setSelectedTeamMember,
        assignFormData,
        setAssignFormData,

        // Upload modal
        showUploadModal,
        setShowUploadModal,
        uploadFiles,
        setUploadFiles,
        uploadLocation,
        setUploadLocation,
        uploadDescription,
        setUploadDescription,

        // Delete document modal
        showDeleteDocumentModal,
        setShowDeleteDocumentModal,
        documentToDelete,

        // Export modal
        showExportModal,
        setShowExportModal,
        isExporting,

        // Progress modal
        showProgressModal,
        setShowProgressModal,
        progressUpdateTarget,
        isUpdatingProgress,

        // Data
        userTasks,
        risks,
        fetchRisks,
        procurements,
        setProcurements,

        // Approvals
        projectApprovals,
        userApproval,
        isUpdatingApproval,
        showApprovalModal,
        setShowApprovalModal,

        // Budget change approval
        showBudgetChangeModal,
        setShowBudgetChangeModal,
        showBudgetWorkflowModal,
        setShowBudgetWorkflowModal,
        activeBudgetApproval,

        // Closure
        isStartingClosure,

        // BOM
        showBOMModal,
        setShowBOMModal,
        bomData,
        isGeneratingBOM,

        // Handlers
        handleHealthScoreUpdate,
        startClosureProcess,
        calculateProjectHealth,
        refreshProjectAndApprovals,
        generateBOM,
        handleAddTeamMember,
        handleDeleteTeamMember,
        handleDeleteProject,
        handleArchiveProject,
        handleChangeManager,
        handleEditSuccess,
        handleAssignToTask,
        handleAssignTeamMemberToTask,
        handleActionClick,
        handleFileUpload,
        handleDownloadDocument,
        handleViewDocument,
        handleDeleteDocument,
        confirmDeleteDocument,
        handleUploadModalSubmit,
        handleFileSelect,
        handleExportAllDocuments,
        handleOpenProgressModal,
        handleUpdateProgress,
        handleApproveProject,
        handleRejectProject,
    };
}
