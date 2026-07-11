"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { ProjectWithRelations } from "@/types/project";
import { UserWithAccount } from "@/types/user";
import { ProjectApproval, BOMData } from "../_components/types";

export function useProjectData(params: Promise<{ id: string }>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeView, setActiveView] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [isStarred, setIsStarred] = useState(false);
    const [projectId, setProjectId] = useState<string>("");
    const [isAddTeamMemberModalOpen, setIsAddTeamMemberModalOpen] =
        useState(false);
    const [availableUsers, setAvailableUsers] = useState<
        Array<{ value: string; label: string }>
    >([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showArchiveConfirmation, setShowArchiveConfirmation] =
        useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [showChangeManagerModal, setShowChangeManagerModal] = useState(false);
    const [isChangingManager, setIsChangingManager] = useState(false);
    const [availableManagers, setAvailableManagers] = useState<
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
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
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
    const [isExporting, setIsExporting] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressUpdateTarget, setProgressUpdateTarget] = useState<{
        type: "project" | "task";
        id?: number;
        name: string;
    } | null>(null);
    const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
    const [userTasks, setUserTasks] = useState<any[]>([]);
    const [risks, setRisks] = useState<any[]>([]);
    const [procurements, setProcurements] = useState<any[]>([]);

    const [projectApprovals, setProjectApprovals] = useState<ProjectApproval[]>(
        []
    );
    const [userApproval, setUserApproval] = useState<ProjectApproval | null>(
        null
    );
    const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);

    const [showBudgetChangeModal, setShowBudgetChangeModal] = useState(false);
    const [showBudgetWorkflowModal, setShowBudgetWorkflowModal] = useState(false);
    const [activeBudgetApproval, setActiveBudgetApproval] = useState<ProjectApproval[]>([]);

    const [isStartingClosure, setIsStartingClosure] = useState(false);

    const [showBOMModal, setShowBOMModal] = useState(false);
    const [bomData, setBomData] = useState<BOMData | null>(null);
    const [isGeneratingBOM, setIsGeneratingBOM] = useState(false);
    const [isExportingBOM, setIsExportingBOM] = useState(false);

    const isDarkMode =
        typeof window !== "undefined" &&
        document.documentElement.classList.contains("dark");

    // --- Handlers ---

    const handleHealthScoreUpdate = (newHealthScore: number) => {
        if (project) {
            setProject({
                ...project,
                healthScore: newHealthScore,
            });
        }
    };

    const startClosureProcess = async () => {
        if (!projectId) return;

        setIsStartingClosure(true);
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/closure/start`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Closure process started successfully!");
                window.location.reload();
            }
        } catch (error: any) {
            console.error("Error starting closure process:", error);
            if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error(
                    "Failed to start closure process. Please try again."
                );
            }
        } finally {
            setIsStartingClosure(false);
        }
    };

    const calculateProjectHealth = useCallback(async (pid: string) => {
        try {
            const response = await axios.post(
                `/api/projects/${pid}/health`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 200 && response.data) {
                const healthScore = response.data.healthScore;
                console.log(
                    "Health score calculated automatically:",
                    healthScore
                );

                setProject((prevProject) => {
                    if (prevProject) {
                        return {
                            ...prevProject,
                            healthScore: healthScore,
                        };
                    }
                    return prevProject;
                });
            }
        } catch (error) {
            console.error(
                "Error calculating health score automatically:",
                error
            );
        }
    }, []);

    const refreshProjectAndApprovals = useCallback(async () => {
        if (!projectId) return;
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            const [projectRes, approvalsRes] = await Promise.all([
                axios.get(`/api/projects/${projectId}`, { headers }),
                axios.get(`/api/projects/${projectId}/approval`, { headers }),
            ]);
            setProject(projectRes.data);
            setProjectApprovals(approvalsRes.data);
            if (currentUserId) {
                const userApprovalRecord = approvalsRes.data.find(
                    (a: ProjectApproval) => a.user_id === currentUserId
                );
                setUserApproval(userApprovalRecord || null);
            }
        } catch (e) {
            console.error("Error refreshing project/approvals", e);
        }
    }, [projectId, currentUserId]);

    const generateBOM = async () => {
        if (!projectId) return;

        setIsGeneratingBOM(true);
        try {
            const response = await axios.get(`/api/projects/${projectId}/bom`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            setBomData(response.data);
            setShowBOMModal(true);
            toast.success("BOM generated successfully!");
        } catch (error: any) {
            console.error("Error generating BOM:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to generate BOM";
            toast.error(errorMessage);
        } finally {
            setIsGeneratingBOM(false);
        }
    };

    const exportBOMToPDF = async () => {
        if (!bomData) return;

        setIsExportingBOM(true);
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/bom/export/pdf`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `${project?.project_code || projectId}_BOM.pdf`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("BOM exported to PDF successfully!");
        } catch (error: any) {
            console.error("Error exporting BOM to PDF:", error);
            toast.error("Failed to export BOM to PDF");
        } finally {
            setIsExportingBOM(false);
        }
    };

    const exportBOMToExcel = async () => {
        if (!bomData) return;

        setIsExportingBOM(true);
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/bom/export/excel`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `${project?.project_code || projectId}_BOM.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("BOM exported to Excel successfully!");
        } catch (error: any) {
            console.error("Error exporting BOM to Excel:", error);
            toast.error("Failed to export BOM to Excel");
        } finally {
            setIsExportingBOM(false);
        }
    };

    const handleAddTeamMember = async (data: Record<string, any>) => {
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/assign`,
                {
                    user_id: parseInt(data.user_id),
                    workload: parseInt(data.workload),
                    is_lead: data.is_lead === "true",
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            const updatedProject = await axios.get(
                `/api/projects/${projectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            setProject(updatedProject.data);
            setIsAddTeamMemberModalOpen(false);
            toast.success("Team member added successfully");
        } catch (error: any) {
            console.error("Error adding team member:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to add team member";
            toast.error(errorMessage);
            setIsAddTeamMemberModalOpen(false);
        }
    };

    const handleDeleteTeamMember = async (userId: number) => {
        try {
            const response = await axios.delete(
                `/api/projects/${projectId}/assign`,
                {
                    data: { userIds: [userId] },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (response.status === 200) {
                const updatedProject = await axios.get(
                    `/api/projects/${projectId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );
                setProject(updatedProject.data);
                toast.success("Team member removed successfully");
            }
        } catch (error) {
            console.error("Error removing team member:", error);
            toast.error("Failed to remove team member");
            throw error;
        }
    };

    const handleDeleteProject = async () => {
        try {
            setIsDeleting(true);
            await axios.delete(`/api/projects/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            toast.success("Project deleted successfully");
            router.push("/projects");
        } catch (error: any) {
            console.error("Error deleting project:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to delete project";
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirmation(false);
        }
    };

    const handleArchiveProject = async () => {
        try {
            setIsArchiving(true);
            await axios.post(
                "/api/projects/archive",
                {
                    project_ids: [parseInt(projectId)],
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            toast.success("Project archived successfully");
            router.push("/projects");
        } catch (error: any) {
            console.error("Error archiving project:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to archive project";
            toast.error(errorMessage);
        } finally {
            setIsArchiving(false);
            setShowArchiveConfirmation(false);
        }
    };

    const handleChangeManager = async () => {
        if (!selectedManagerId) {
            toast.error("Please select a new manager");
            return;
        }

        try {
            setIsChangingManager(true);
            await axios.put(
                `/api/projects/${projectId}`,
                {
                    manager_id: parseInt(selectedManagerId),
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            toast.success("Project manager changed successfully");

            const updatedProject = await axios.get(
                `/api/projects/${projectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );
            setProject(updatedProject.data);

            setShowChangeManagerModal(false);
            setSelectedManagerId("");
        } catch (error: any) {
            console.error("Error changing project manager:", error);
            const errorMessage =
                error.response?.data?.error ||
                "Failed to change project manager";
            toast.error(errorMessage);
        } finally {
            setIsChangingManager(false);
        }
    };

    const handleEditSuccess = async () => {
        try {
            const response = await axios.get(`/api/projects/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setProject(response.data);
        } catch (error) {
            console.error("Error refreshing project data:", error);
        }
    };

    const handleAssignToTask = async (data: {
        user_id: string;
        task_id: string;
    }) => {
        try {
            console.log("Assign to task called with data:", data);

            if (!data.user_id || !data.task_id) {
                toast.error("Please select both a team member and a task");
                return;
            }

            const userId = parseInt(data.user_id);
            const taskId = parseInt(data.task_id);

            console.log("Parsed IDs - userId:", userId, "taskId:", taskId);

            if (isNaN(userId) || isNaN(taskId)) {
                toast.error("Invalid selection. Please try again.");
                return;
            }

            console.log("Making API call to assign task...");

            const response = await axios.post(
                `/api/tasks/${taskId}/assign`,
                {
                    user_ids: [userId],
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                        "x-user-role": activeView === "admin" ? "admin" : "PJM",
                    },
                }
            );

            console.log("API response:", response);

            if (response.status === 200) {
                const updatedProject = await axios.get(
                    `/api/projects/${projectId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );
                setProject(updatedProject.data);
                setShowAssignTaskModal(false);
                setSelectedTeamMember(null);
                setAssignFormData({ user_id: "", task_id: "" });
                toast.success("Team member assigned to task successfully");
            }
        } catch (error: any) {
            console.error("Error assigning team member to task:", error);
            const errorMessage =
                error.response?.data?.error ||
                "Failed to assign team member to task";
            toast.error(errorMessage);
        }
    };

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
                setShowEditModal(true);
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
            case "upload_doc":
                const fileInput = document.getElementById(
                    "upload-doc-input"
                ) as HTMLInputElement;
                if (fileInput) {
                    fileInput.click();
                }
                break;
            default:
                console.log(`Action ${action} not implemented yet`);
        }
    };

    const handleFileUpload = async (
        files: File[],
        uploadLoc?: { type: "project" | "wbs" | "task"; id?: string },
        description?: string
    ) => {
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append(
                    "description",
                    description || `Uploaded file: ${file.name}`
                );

                let endpoint = "/api/documents";

                if (uploadLoc) {
                    switch (uploadLoc.type) {
                        case "project":
                            formData.append("project_id", projectId);
                            endpoint = "/api/documents";
                            break;
                        case "wbs":
                            formData.append("wbs_id", uploadLoc.id!);
                            endpoint = "/api/documents/uploadFile";
                            break;
                        case "task":
                            formData.append("task_id", uploadLoc.id!);
                            endpoint = "/api/documents/uploadFile";
                            break;
                    }
                } else {
                    formData.append("project_id", projectId);
                }

                const response = await axios.post(endpoint, formData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                        "Content-Type": "multipart/form-data",
                    },
                });

                if (response.status === 200) {
                    toast.success(
                        `${file.name} uploaded successfully to ${
                            uploadLoc?.type || "project"
                        }`
                    );
                }
            }

            const updatedProject = await axios.get(
                `/api/projects/${projectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );
            setProject(updatedProject.data);
        } catch (error: any) {
            console.error("Error uploading files:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to upload files";
            toast.error(errorMessage);
        }
    };

    const handleDownloadDocument = async (doc: any) => {
        try {
            const response = await axios.get(
                `/api/documents/download?documentId=${doc.document_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;

            const originalName =
                doc.name.includes("_") && doc.name.match(/.*_\d+\./g)
                    ? doc.name.substring(0, doc.name.lastIndexOf("_")) +
                      doc.name.substring(doc.name.lastIndexOf("."))
                    : doc.name;

            link.setAttribute("download", originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`Downloaded ${originalName}`);
        } catch (error) {
            console.error("Error downloading document:", error);
            toast.error("Failed to download document");
        }
    };

    const handleViewDocument = (doc: any) => {
        try {
            if (doc?.document_id) {
                window.open(`/api/documents/download?documentId=${doc.document_id}`, "_blank");
                return;
            }
            toast.error("Document path not available for viewing");
        } catch (error) {
            console.error("Error viewing document:", error);
            toast.error("Failed to open document");
        }
    };

    const handleDeleteDocument = async (doc: any) => {
        setDocumentToDelete(doc);
        setShowDeleteDocumentModal(true);
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;

        try {
            await axios.delete(
                `/api/documents/${documentToDelete.document_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            const updatedProject = await axios.get(
                `/api/projects/${projectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );
            setProject(updatedProject.data);
            toast.success("Document deleted successfully");

            setShowDeleteDocumentModal(false);
            setDocumentToDelete(null);
        } catch (error) {
            console.error("Error deleting document:", error);
            toast.error("Failed to delete document");
            setShowDeleteDocumentModal(false);
            setDocumentToDelete(null);
        }
    };

    const handleUploadModalSubmit = async () => {
        if (uploadFiles.length === 0) {
            toast.error("Please select files to upload");
            return;
        }

        await handleFileUpload(uploadFiles, uploadLocation, uploadDescription);

        setShowUploadModal(false);
        setUploadFiles([]);
        setUploadLocation({ type: "project" });
        setUploadDescription("");

        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach((input: any) => {
            input.value = "";
        });
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

    const handleExportAllDocuments = async () => {
        if (
            !project ||
            !(project as any).documents ||
            (project as any).documents.length === 0
        ) {
            toast.error("No documents to export");
            return;
        }

        setIsExporting(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            const documents = (project as any).documents;

            for (const doc of documents) {
                try {
                    const response = await axios.get(
                        `/api/documents/download?documentId=${doc.document_id}`,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem(
                                    "token"
                                )}`,
                            },
                            responseType: "blob",
                        }
                    );

                    const url = window.URL.createObjectURL(
                        new Blob([response.data])
                    );
                    const link = document.createElement("a");
                    link.href = url;

                    const originalName =
                        doc.name.includes("_") && doc.name.match(/.*_\d+\./g)
                            ? doc.name.substring(0, doc.name.lastIndexOf("_")) +
                              doc.name.substring(doc.name.lastIndexOf("."))
                            : doc.name;

                    link.setAttribute("download", originalName);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);

                    successCount++;

                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`Error downloading ${doc.name}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success(
                    `Successfully exported ${successCount} document${
                        successCount !== 1 ? "s" : ""
                    }`
                );
            }
            if (errorCount > 0) {
                toast.error(
                    `Failed to export ${errorCount} document${
                        errorCount !== 1 ? "s" : ""
                    }`
                );
            }
        } catch (error) {
            console.error("Error during export:", error);
            toast.error("Failed to export documents");
        } finally {
            setIsExporting(false);
            setShowExportModal(false);
        }
    };

    const handleUpdateProgress = async (data: Record<string, any>) => {
        if (!progressUpdateTarget) return;

        setIsUpdatingProgress(true);

        try {
            let endpoint = "";
            let payload: any = {};

            if (progressUpdateTarget.type === "project") {
                endpoint = `/api/projects/${projectId}`;
                payload = {
                    progress_percentage: parseInt(data.progress_percentage),
                    status: data.status,
                };
            } else if (progressUpdateTarget.type === "task") {
                endpoint = `/api/tasks/${progressUpdateTarget.id}`;
                payload = {
                    progress_percentage: parseInt(data.progress_percentage),
                    status: data.status,
                    actual_hours: data.actual_hours
                        ? parseFloat(data.actual_hours)
                        : undefined,
                };
            }

            const response = await axios.put(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (response.status === 200) {
                const updatedProject = await axios.get(
                    `/api/projects/${projectId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );
                setProject(updatedProject.data);

                setShowProgressModal(false);
                setProgressUpdateTarget(null);
                toast.success(
                    `${
                        progressUpdateTarget.type === "project"
                            ? "Project"
                            : "Task"
                    } progress updated successfully`
                );
            }
        } catch (error: any) {
            console.error("Error updating progress:", error);
            const errorData = error.response?.data;
            if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
                const errorMessage = errorData.error || "Cannot update task status";
                const reasons = errorData.reasons.join(". ");
                toast.error(`${errorMessage}: ${reasons}`);
            } else {
                toast.error(errorData?.error || "Failed to update progress");
            }
        } finally {
            setIsUpdatingProgress(false);
        }
    };

    const handleApproveProject = async () => {
        if (!userApproval || !currentUserId) return;

        setIsUpdatingApproval(true);
        try {
            const response = await axios.patch(
                `/api/projects/${projectId}/approval/${userApproval.id}`,
                {
                    status: "APPROVED",
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            setUserApproval({ ...userApproval, status: "APPROVED" });
            setProjectApprovals((prev) =>
                prev.map((approval) =>
                    approval.id === userApproval.id
                        ? { ...approval, status: "APPROVED" }
                        : approval
                )
            );

            toast.success("Project approved successfully");

            const projectResponse = await axios.get(
                `/api/projects/${projectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );
            setProject(projectResponse.data);
        } catch (error: any) {
            console.error("Error approving project:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to approve project";
            toast.error(errorMessage);
        } finally {
            setIsUpdatingApproval(false);
        }
    };

    const handleRejectProject = async () => {
        if (!userApproval || !currentUserId) return;

        setIsUpdatingApproval(true);
        try {
            const response = await axios.patch(
                `/api/projects/${projectId}/approval/${userApproval.id}`,
                {
                    status: "REJECTED",
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            setUserApproval({ ...userApproval, status: "REJECTED" });
            setProjectApprovals((prev) =>
                prev.map((approval) =>
                    approval.id === userApproval.id
                        ? { ...approval, status: "REJECTED" }
                        : approval
                )
            );

            toast.success("Project rejected");

            const projectResponse = await axios.get(
                `/api/projects/${projectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );
            setProject(projectResponse.data);
        } catch (error: any) {
            console.error("Error rejecting project:", error);
            const errorMessage =
                error.response?.data?.error || "Failed to reject project";
            toast.error(errorMessage);
        } finally {
            setIsUpdatingApproval(false);
        }
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
        if (!projectId) return;
        axios
            .get(`/api/projects/${projectId}/risks`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => setRisks(res.data));
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return;
        axios
            .get(`/api/projects/${projectId}/procurements`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => setProcurements(res.data))
            .catch((error) =>
                console.error("Error fetching procurements:", error)
            );
    }, [projectId]);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await axios.get("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data && response.data.user) {
                    setCurrentUserId(response.data.user.user_id);

                    if (
                        response.data.user.role &&
                        response.data.user.role.name
                    ) {
                        const userRole =
                            response.data.user.role.name.toLowerCase();

                        if (
                            userRole === "admin" ||
                            userRole === "administrator"
                        ) {
                            setActiveView("admin");
                        } else if (
                            userRole === "pjm" ||
                            userRole.includes("project")
                        ) {
                            setActiveView("project-manager");
                        } else if (userRole === "dir" || userRole === "pmo") {
                            setActiveView("admin");
                        } else if (userRole === "fin") {
                            setActiveView("fin");
                        } else if (userRole === "proc") {
                            setActiveView("procurement");
                        } else if (userRole === "qaqc") {
                            setActiveView("QAQC");
                        } else if (userRole === "it") {
                            setActiveView("IT");
                        } else if (
                            ["eng", "site", "qaqc", "technical"].includes(
                                userRole
                            )
                        ) {
                            setActiveView("technical");
                        } else {
                            setActiveView("technical");
                        }

                        console.log(
                            "User role detected:",
                            userRole,
                            "View set to:",
                            activeView
                        );
                    }
                }
            } catch (error) {
                console.error("Error fetching current user:", error);
            }
        };

        fetchCurrentUser();
    }, []);

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
        const fetchAvailableUsers = async () => {
            try {
                const response = await axios.get("/api/users", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });

                const currentTeamMemberIds =
                    project?.team_members.map(
                        (member) => member.user.user_id
                    ) || [];

                const filtered = response.data
                    .filter(
                        (user: UserWithAccount) =>
                            !currentTeamMemberIds.includes(user.user_id) &&
                            user.account
                    )
                    .map((user: UserWithAccount) => ({
                        value: user.user_id.toString(),
                        label: `${user.account.first_name} ${user.account.last_name} (${user.email})`,
                    }));

                setAvailableUsers(filtered);
            } catch (error) {
                console.error("Error fetching available users:", error);
            }
        };

        if (projectId && project) {
            fetchAvailableUsers();
        }
    }, [projectId, project]);

    useEffect(() => {
        const fetchAvailableManagers = async () => {
            try {
                const response = await axios.get("/api/users", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });

                const managers = response.data
                    .filter(
                        (user: UserWithAccount) =>
                            user.role?.name?.toLowerCase() === "pjm" &&
                            user.user_id !== project?.manager?.user_id
                    )
                    .map((user: UserWithAccount) => ({
                        user_id: user.user_id,
                        account: {
                            first_name: user.account.first_name,
                            last_name: user.account.last_name,
                        },
                        email: user.email,
                        role: {
                            name: user.role?.name,
                        },
                    }));

                setAvailableManagers(managers);
            } catch (error) {
                console.error("Error fetching available managers:", error);
            }
        };

        if (projectId && project) {
            fetchAvailableManagers();
        }
    }, [projectId, project]);

    useEffect(() => {
        if (!projectId || !activeView) return;

        setLoading(true);

        const shouldFilterMyTasks =
            activeView === "technical" || activeView === "fin";
        const apiUrl = shouldFilterMyTasks
            ? `/api/projects/${projectId}?myTasks=true`
            : `/api/projects/${projectId}`;

        axios
            .get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then(async (res) => {
                console.log("Project data fetched:", res.data);
                console.log("Project tasks:", res.data.tasks?.length || 0);
                console.log("Current user ID:", currentUserId);
                console.log("Filtered for my tasks:", shouldFilterMyTasks);
                setProject(res.data);
                setLoading(false);

                console.log("Triggering automatic health calculation...");
                await calculateProjectHealth(projectId);
            })
            .catch((err) => {
                console.error("Error fetching project data:", err);
                setLoading(false);
            });
    }, [projectId, activeView, calculateProjectHealth]);

    useEffect(() => {
        if (!projectId) return;

        const fetchUserTasks = async () => {
            try {
                const response = await axios.get("/api/tasks", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });

                console.log(response.data);
                console.log("Project ID:", projectId);

                setUserTasks(response.data);
                console.log("User tasks fetched:", response.data.length);
            } catch (error) {
                console.error("Error fetching user tasks:", error);
            }
        };

        fetchUserTasks();
    }, [projectId]);

    useEffect(() => {
        if (project && project.status === "planning") {
            router.replace(`/projects/${projectId}/setup`);
        }
    }, [project, projectId, router]);

    useEffect(() => {
        if (!projectId) return;

        const fetchProjectApprovals = async () => {
            try {
                const response = await axios.get(
                    `/api/projects/${projectId}/approval`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );

                const approvals = [...response.data].sort(
                    (a: any, b: any) => b.id - a.id
                );
                setProjectApprovals(approvals);

                if (currentUserId) {
                    const mine = approvals.filter(
                        (approval: ProjectApproval) =>
                            approval.user_id === currentUserId
                    );
                    const actionable = mine.find((approval: any) =>
                        ["PENDING", "REVISION_REQUESTED"].includes(approval.status)
                    );
                    setUserApproval((actionable || mine[0]) ?? null);
                }
            } catch (error) {
                console.error("Error fetching project approvals:", error);
            }
        };

        fetchProjectApprovals();
    }, [projectId, currentUserId]);

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
        isDarkMode,

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
        isExportingBOM,

        // Handlers
        handleHealthScoreUpdate,
        startClosureProcess,
        calculateProjectHealth,
        refreshProjectAndApprovals,
        generateBOM,
        exportBOMToPDF,
        exportBOMToExcel,
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
