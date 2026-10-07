"use client";

import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/modal";
import {
    ArrowLeft,
    Check,
    CheckCircle,
    Clock,
    FileText,
    AlertTriangle,
    Upload,
    Download,
    Eye,
    X,
    Plus,
    Edit,
    Trash2,
    User,
    Calendar,
    ExternalLink,
    Search,
    Loader2,
} from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Dropdown } from "@/components/ui/dropdown";
import { TabRow } from "@/components/ui/tab-row";
import {
    Breadcrumb,
    DetailPanel,
    EmptyState,
    StatusBadge,
    RowAction,
    RowActions,
    EntityCode,
    inputClass,
    textareaClass,
    actionPrimary,
    actionSecondary,
    type BadgeTone,
} from "@/components/ui/form-shell";

/**
 * Project status to the pill shown beside the title.
 *
 * The screen previously inlined a three-arm conditional that collapsed every
 * non-completed status into a grey "In progress", so a planning project and a
 * cancelled one looked identical. Mapping each status to a tone keeps the
 * colour meaning consistent with the list screens.
 */
const CLOSURE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
    completed: { label: "Project Completed", tone: "success" },
    closed: { label: "Project Closed", tone: "success" },
    execution: { label: "In Execution", tone: "info" },
    planning: { label: "In Planning", tone: "warning" },
    on_hold: { label: "On Hold", tone: "warning" },
    cancelled: { label: "Cancelled", tone: "danger" },
};

/**
 * The seven closure steps, in the order they must be completed.
 *
 * This list was previously written inline inside the JSX, which meant the tab
 * row, the "next required step" helper and the accessibility gate each carried
 * their own copy of the ordering and could drift apart. One definition drives
 * all three.
 */
const CLOSURE_TABS: {
    id: string;
    label: string;
    type: string | null;
    icon: ReactNode;
}[] = [
    { id: "checklist", label: "Overview", type: null, icon: <CheckCircle className="h-4 w-4" /> },
    { id: "inspection", label: "Inspection", type: "inspection", icon: <Eye className="h-4 w-4" /> },
    { id: "punch-create", label: "Create Punch Items", type: "create_punch_list", icon: <Plus className="h-4 w-4" /> },
    { id: "punch-resolve", label: "Resolve Punch Items", type: "punch_list", icon: <AlertTriangle className="h-4 w-4" /> },
    { id: "documents", label: "Documents", type: "documents", icon: <FileText className="h-4 w-4" /> },
    { id: "handover", label: "Handover", type: "handover", icon: <User className="h-4 w-4" /> },
    { id: "approvals", label: "Approvals", type: "approval", icon: <CheckCircle className="h-4 w-4" /> },
    { id: "reports", label: "Reports", type: "manual", icon: <Download className="h-4 w-4" /> },
];

const ProjectClosurePage = ({
    params,
}: {
    params: Promise<{ id: string }>;
}) => {
    const router = useRouter();
    const confirm = useConfirm();
    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string>("");
    const [activeSection, setActiveSection] = useState("checklist");
    const [isStartingClosure, setIsStartingClosure] = useState(false);

    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [selectedDocumentItem, setSelectedDocumentItem] = useState<any>(null);
    const [showAddPunchItemModal, setShowAddPunchItemModal] = useState(false);
    const [showEditPunchItemModal, setShowEditPunchItemModal] = useState(false);
    const [selectedPunchItem, setSelectedPunchItem] = useState<any>(null);
    const [punchItemForm, setPunchItemForm] = useState({
        title: "",
        assignee_id: "",
    });

    // Inspection states
    const [showScheduleInspectionModal, setShowScheduleInspectionModal] = useState(false);
    const [inspectionForm, setInspectionForm] = useState({
        scheduled_date: "",
        scheduled_time: "",
        inspector_id: "",
    });
    const [showInspectionDetailsModal, setShowInspectionDetailsModal] = useState(false);
    const [inspectionNotes, setInspectionNotes] = useState("");
    const [inspectionDocuments, setInspectionDocuments] = useState<File[]>([]);
    const [inspectionSubmitting, setInspectionSubmitting] = useState(false);
    const [scheduleInspectionSubmitting, setScheduleInspectionSubmitting] = useState(false);
    const [inspectorSearchQuery, setInspectorSearchQuery] = useState("");
    const [inspectorDropdownOpen, setInspectorDropdownOpen] = useState(false);
    const inspectorDropdownRef = useRef<HTMLDivElement>(null);
    const [handoverSearchQuery, setHandoverSearchQuery] = useState("");
    const [recipientDropdownOpen, setRecipientDropdownOpen] = useState(false);
    const recipientDropdownRef = useRef<HTMLDivElement>(null);
    const [handoverDropdownOpen, setHandoverDropdownOpen] = useState(false);
    const [scheduleHandoverSubmitting, setScheduleHandoverSubmitting] = useState(false);
    const handoverDropdownRef = useRef<HTMLDivElement>(null);

    // Handover states
    const [showScheduleHandoverModal, setShowScheduleHandoverModal] = useState(false);
    const [handoverForm, setHandoverForm] = useState({
        handover_date: "",
        handover_time: "",
        handed_over_by: "",
        handed_over_to: "",
        notes: "",
    });
    const [showHandoverDetailsModal, setShowHandoverDetailsModal] = useState(false);
    const [handoverNotes, setHandoverNotes] = useState("");
    const [handoverReceiptFile, setHandoverReceiptFile] = useState<File | null>(null);

    // Approval states
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalType, setApprovalType] = useState<'inspection' | 'handover' | 'closeout'>('inspection');
    const [approvalNotes, setApprovalNotes] = useState("");
    const [approvalDecision, setApprovalDecision] = useState<'approve' | 'reject'>('approve');

    // PDF Report states
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Closure document upload loading
    const [uploadingDocumentItemId, setUploadingDocumentItemId] = useState<number | null>(null);
    const [bulkUploading, setBulkUploading] = useState(false);


    // Helper function to check if a step is accessible
    const isStepAccessible = (stepType: string) => {
        if (!project?.closure_checklists) return false;
        
        const stepOrder = [
            'inspection', 'create_punch_list', 'punch_list', 
            'documents', 'handover', 'approval', 'manual'
        ];
        
        const currentStepIndex = stepOrder.indexOf(stepType);
        
        // Check if all previous steps are completed
        for (let i = 0; i < currentStepIndex; i++) {
            const prevStepItem = project.closure_checklists.find(
                item => item.type === stepOrder[i]
            );
            if (!prevStepItem || prevStepItem.status !== 'complete') {
                return false;
            }
        }
        
        return true;
    };

    // Helper function to get the next required step
    const getNextRequiredStep = () => {
        if (!project?.closure_checklists) return null;
        
        const stepOrder = [
            { type: 'inspection', label: 'Final Inspection' },
            { type: 'create_punch_list', label: 'Create Punch List Items' },
            { type: 'punch_list', label: 'Resolve Punch List Items' },
            { type: 'documents', label: 'Upload Documents' },
            { type: 'handover', label: 'Project Handover' },
            { type: 'approval', label: 'Final Approval' },
            { type: 'manual', label: 'Generate Final Report' }
        ];
        
        for (const step of stepOrder) {
            const checklistItem = project.closure_checklists.find(
                item => item.type === step.type && item.status === 'pending'
            );
            
            if (checklistItem && isStepAccessible(step.type)) {
                return step;
            }
        }
        
        return null;
    };

    /**
     * Tabs the user may actually open right now.
     *
     * Overview is always available; a step tab appears only while that step is
     * the pending one whose predecessors are all complete, which is what keeps
     * the workflow linear.
     */
    const nextStep = getNextRequiredStep();

    const visibleTabs = CLOSURE_TABS.filter((tab) => {
        if (tab.id === "checklist") return true;
        if (!tab.type || !project?.closure_checklists) return false;
        const item = project.closure_checklists.find((c) => c.type === tab.type);
        return Boolean(item && item.status === "pending" && isStepAccessible(tab.type));
    });

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    useEffect(() => {
        if (!projectId) return;
        fetchProject();
    }, [projectId]);

    // Close inspector/handover dropdowns on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (inspectorDropdownRef.current && !inspectorDropdownRef.current.contains(e.target as Node)) setInspectorDropdownOpen(false);
            if (handoverDropdownRef.current && !handoverDropdownRef.current.contains(e.target as Node)) setHandoverDropdownOpen(false);
            if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(e.target as Node)) setRecipientDropdownOpen(false);
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    // Auto-set active section based on current pending step
    useEffect(() => {
        if (!project?.closure_checklists) return;

        // Define the order of closure steps
        const stepOrder = [
            { type: 'inspection', section: 'inspection' },
            { type: 'create_punch_list', section: 'punch-create' },
            { type: 'punch_list', section: 'punch-resolve' },
            { type: 'documents', section: 'documents' },
            { type: 'handover', section: 'handover' },
            { type: 'approval', section: 'approvals' },
            { type: 'manual', section: 'reports' } // For "Generate Final Report"
        ];

        // Find the first pending step that can be accessed (previous steps completed)
        for (let i = 0; i < stepOrder.length; i++) {
            const step = stepOrder[i];
            const checklistItem = project.closure_checklists.find(
                item => item.type === step.type && item.status === 'pending'
            );
            
            if (checklistItem) {
                // Check if all previous steps are completed
                let canAccess = true;
                for (let j = 0; j < i; j++) {
                    const prevStepItem = project.closure_checklists.find(
                        item => item.type === stepOrder[j].type
                    );
                    if (!prevStepItem || prevStepItem.status !== 'complete') {
                        canAccess = false;
                        break;
                    }
                }
                
                if (canAccess) {
                    setActiveSection(step.section);
                    return;
                }
            }
        }

        // If no accessible pending steps, show checklist overview
        setActiveSection('checklist');
    }, [project?.closure_checklists]);

    useEffect(() => {
  if (!project?.punch_list_items || !project?.closure_checklists) return;

  const allResolved =
    project.punch_list_items.length > 0 &&
    project.punch_list_items.every(item => item.status === 'resolved');

  const punchChecklist = project.closure_checklists.find(
    item => item.type === 'punch_list'
  );

  if (allResolved && punchChecklist?.status === 'pending') {
    // Automatically mark punch list checklist item as complete
    handleCompletePunchListCreation();
  }
}, [project?.punch_list_items]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/projects/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setProject(response.data);
            console.log('Project data fetched:', {
                final_inspection: response.data.final_inspection,
                closure_checklists: response.data.closure_checklists?.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    type: item.type,
                    status: item.status
                }))
            });
        } catch (error) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project data");
        } finally {
            setLoading(false);
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
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Closure process started successfully!");
                fetchProject(); // Refresh data
            }
        } catch (error: any) {
            console.error("Error starting closure process:", error);
            if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error("Failed to start closure process. Please try again.");
            }
        } finally {
            setIsStartingClosure(false);
        }
    };

    const handleChecklistToggle = async (checklistItemId: number) => {
        try {
            const response = await axios.patch(
                `/api/projects/${projectId}/closure/checklist/${checklistItemId}`,
                { status: "complete" },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            
            if (response.status === 200) {
                toast.success("Checklist item updated");
                fetchProject();
            }
        } catch (error) {
            console.error("Error updating checklist item:", error);
            toast.error("Failed to update checklist item");
        }
    };

    const handleFileUpload = async (documentItemId: number, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_item_id", documentItemId.toString());

        setUploadingDocumentItemId(documentItemId);
        try {
            const response = await axios.patch(
                `/api/projects/${projectId}/closure/documents/${documentItemId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Document uploaded successfully");
                
                // Update the project state locally instead of refetching
                setProject(prevProject => {
                    if (!prevProject) return prevProject;
                    
                    const updatedProject = {
                        ...prevProject,
                        closure_documents: prevProject.closure_documents?.map(docItem => 
                            docItem.id === documentItemId 
                                ? {
                                    ...docItem,
                                    document: response.data.document,
                                    submitted: true,
                                    approved: true
                                }
                                : docItem
                        )
                    };

                    // If the API indicates that all documents are uploaded, update the checklist
                    if (response.data.checklistCompleted) {
                        updatedProject.closure_checklists = prevProject.closure_checklists?.map(checklistItem =>
                            checklistItem.type === 'documents'
                                ? {
                                    ...checklistItem,
                                    status: 'complete' as const,
                                    completed_at: new Date()
                                }
                                : checklistItem
                        );
                    }

                    return updatedProject;
                });
                
                setShowUploadModal(false);
                setSelectedDocumentItem(null);
            }
        } catch (error) {
            console.error("Error uploading document:", error);
            toast.error("Failed to upload document");
        } finally {
            setUploadingDocumentItemId(null);
        }
    };

    const handleBulkDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        
        // Add all files to the form data
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        setBulkUploading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/closure/documents`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to upload documents');
            }

            const result = await response.json();
            
            if (result.success) {
                toast.success(`Successfully uploaded ${result.results.length} document(s)`);
                
                if (result.errors && result.errors.length > 0) {
                    toast.error(`${result.errors.length} document(s) failed to upload`);
                    console.log('Upload errors:', result.errors);
                }

                // Refresh project data to show uploaded documents
                fetchProject();
            } else {
                toast.error('Failed to upload documents');
                console.error('Upload failed:', result.errors);
            }
        } catch (error) {
            console.error('Error uploading documents:', error);
            toast.error('Failed to upload documents');
        } finally {
            setBulkUploading(false);
        }

        // Reset the input
        event.target.value = '';
    };

    const handleAddPunchItem = async () => {
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/closure/punch-list`,
                punchItemForm,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 201) {
                toast.success("Punch list item added");
                
                // Add the new item to the project state locally
                setProject(prevProject => {
                    if (!prevProject) return prevProject;
                    
                    return {
                        ...prevProject,
                        punch_list_items: [
                            ...(prevProject.punch_list_items || []),
                            response.data
                        ]
                    };
                });
                
                setShowAddPunchItemModal(false);
                setPunchItemForm({
                    title: "",
                    assignee_id: "",
                });
            }
        } catch (error) {
            console.error("Error adding punch item:", error);
            toast.error("Failed to add punch list item");
        }
    };

    const handleUpdatePunchItem = async (itemId: number, status: string) => {
        try {
            const response = await axios.patch(
                `/api/projects/${projectId}/closure/punch-list/${itemId}`,
                { status },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Punch list item updated");
                
                // Update the project state locally instead of refetching
                setProject(prevProject => {
                    if (!prevProject) return prevProject;
                    
                    return {
                        ...prevProject,
                        punch_list_items: prevProject.punch_list_items?.map(item => 
                            item.id === itemId 
                                ? { 
                                    ...item, 
                                    status, 
                                    resolved_at: status === 'resolved' ? new Date() : null 
                                }
                                : item
                        )
                    };
                });
            }
        } catch (error) {
            console.error("Error updating punch item:", error);
            toast.error("Failed to update punch list item");
        }
    };

    const handleDeletePunchItem = async (itemId: number) => {
        const ok = await confirm({
            title: "Delete punch list item?",
            message: "This removes the item from the punch list permanently.",
            confirmText: "Delete",
            tone: "danger",
        });
        if (!ok) return;

        try {
            const response = await axios.delete(
                `/api/projects/${projectId}/closure/punch-list/${itemId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Punch list item deleted");
                
                // Remove the item from the project state locally
                setProject(prevProject => {
                    if (!prevProject) return prevProject;
                    
                    return {
                        ...prevProject,
                        punch_list_items: prevProject.punch_list_items?.filter(item => item.id !== itemId)
                    };
                });
            }
        } catch (error) {
            console.error("Error deleting punch item:", error);
            toast.error("Failed to delete punch list item");
        }
    };

    const handleEditPunchItem = async () => {
        if (!selectedPunchItem) return;

        try {
            const response = await axios.patch(
                `/api/projects/${projectId}/closure/punch-list/${selectedPunchItem.id}`,
                {
                    title: punchItemForm.title,
                    assignee_id: punchItemForm.assignee_id || null,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Punch list item updated");
                
                // Update the item in the project state locally
                setProject(prevProject => {
                    if (!prevProject) return prevProject;
                    
                    return {
                        ...prevProject,
                        punch_list_items: prevProject.punch_list_items?.map(item => 
                            item.id === selectedPunchItem.id 
                                ? { ...item, ...response.data }
                                : item
                        )
                    };
                });
                
                setShowEditPunchItemModal(false);
                setSelectedPunchItem(null);
                setPunchItemForm({
                    title: "",
                    assignee_id: "",
                });
            }
        } catch (error) {
            console.error("Error updating punch item:", error);
            toast.error("Failed to update punch list item");
        }
    };

    const handleScheduleInspection = async () => {
        if (!inspectionForm.inspector_id) {
            toast.error("Please select an inspector");
            return;
        }
        setScheduleInspectionSubmitting(true);
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/closure/inspection`,
                inspectionForm,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 201) {
                toast.success("Final inspection scheduled successfully");
                fetchProject();
                setShowScheduleInspectionModal(false);
                setInspectionForm({
                    scheduled_date: "",
                    scheduled_time: "",
                    inspector_id: "",
                });
                setInspectorSearchQuery("");
            }
        } catch (error: any) {
            console.error("Error scheduling inspection:", error);
            if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error("Failed to schedule inspection");
            }
        } finally {
            setScheduleInspectionSubmitting(false);
        }
    };

    const handleUpdateInspection = async () => {
        setInspectionSubmitting(true);
        try {
            // submitted_by is set server-side from authenticated user (PMO user_id)
            const updateData: any = {
                notes: inspectionNotes,
                status: "completed",
            };
            
            
            // Handle document uploads using the new bulk upload API
            if (inspectionDocuments.length > 0) {
                try {
                    const formData = new FormData();
                    
                    // Add all files to the form data
                    inspectionDocuments.forEach(file => {
                        formData.append('files', file);
                    });

                    const uploadResponse = await fetch(`/api/projects/${projectId}/closure/documents`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem("token")}`,
                        }
                    });

                    if (!uploadResponse.ok) {
                        throw new Error('Failed to upload documents');
                    }

                    const uploadResult = await uploadResponse.json();
                    
                    if (uploadResult.success) {
                        console.log(`Successfully uploaded ${uploadResult.results.length} documents`);
                        if (uploadResult.errors && uploadResult.errors.length > 0) {
                            console.warn('Some documents failed to upload:', uploadResult.errors);
                        }
                    } else {
                        console.error('Document upload failed:', uploadResult.errors);
                    }
                } catch (uploadError) {
                    console.error('Error uploading inspection documents:', uploadError);
                    toast.error('Failed to upload some inspection documents');
                }
            }

            console.log('Inspection update data:', updateData);

            const response = await axios.patch(
                `/api/projects/${projectId}/closure/inspection`,
                updateData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Inspection completed and submitted successfully!");
                console.log('Inspection API response:', response.data);
                console.log('Fetching updated project data...');
                
                // Wait a moment before fetching to ensure DB updates are complete
                setTimeout(() => {
                    fetchProject();
                }, 500);
                
                setShowInspectionDetailsModal(false);
                setInspectionNotes("");
                setInspectionDocuments([]);
            }
        } catch (error) {
            console.error("Error updating inspection:", error);
            toast.error("Failed to update inspection");
        } finally {
            setInspectionSubmitting(false);
        }
    };

    const handleCompletePunchListCreation = async () => {
        try {
            // Find the punch list checklist item
            const punchListChecklistItem = project?.closure_checklists?.find(
                item => item.type === 'create_punch_list'
            );

            if (punchListChecklistItem) {
                const response = await axios.patch(
                    `/api/projects/${projectId}/closure/checklist/${punchListChecklistItem.id}`,
                    { status: "complete" },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                    }
                );
                
                if (response.status === 200) {
                    toast.success("Punch list creation marked as complete");
                    fetchProject();
                }
            }
        } catch (error) {
            console.error("Error completing punch list creation:", error);
            toast.error("Failed to mark punch list creation as complete");
        }
    };

    const handleScheduleHandover = async () => {
        if (!handoverForm.handed_over_by) {
            toast.error("Please select a team member for Handed Over By");
            return;
        }
        setScheduleHandoverSubmitting(true);
        try {
            const response = await axios.post(
                `/api/projects/${projectId}/closure/handover`,
                handoverForm,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 201) {
                toast.success("Handover scheduled successfully");
                fetchProject();
                setShowScheduleHandoverModal(false);
                setHandoverForm({
                    handover_date: "",
                    handover_time: "",
                    handed_over_by: "",
                    handed_over_to: "",
                    notes: "",
                });
                setHandoverSearchQuery("");
            }
        } catch (error: any) {
            console.error("Error scheduling handover:", error);
            if (error.response?.data?.error) {
                toast.error(error.response.data.error);
            } else {
                toast.error("Failed to schedule handover");
            }
        } finally {
            setScheduleHandoverSubmitting(false);
        }
    };

    const handleCompleteHandover = async () => {
        try {
            let userId = 1; // Default fallback
            
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.userId || payload.user_id || 1;
                }
            } catch (tokenError) {
                console.warn("Could not parse user ID from token, using default:", tokenError);
            }

            const updateData: any = {
                status: "completed",
                notes: handoverNotes,
            };

            const response = await axios.patch(
                `/api/projects/${projectId}/closure/handover`,
                updateData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Handover completed successfully!");
                fetchProject();
                setShowHandoverDetailsModal(false);
                setHandoverNotes("");
            }
        } catch (error) {
            console.error("Error completing handover:", error);
            toast.error("Failed to complete handover");
        }
    };

    const handleUploadHandoverReceipt = async () => {
        if (!handoverReceiptFile) {
            toast.error("Please select a file to upload");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', handoverReceiptFile);

            const response = await axios.post(
                `/api/projects/${projectId}/closure/handover/receipt`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Handover receipt uploaded successfully");
                fetchProject();
                setHandoverReceiptFile(null);
            }
        } catch (error) {
            console.error("Error uploading handover receipt:", error);
            toast.error("Failed to upload handover receipt");
        }
    };

    // Approval functions
    const handleApproval = async () => {
        try {
            let userId = 1;
            
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.userId || payload.user_id || 1;
                }
            } catch (tokenError) {
                console.warn("Could not parse user ID from token, using default:", tokenError);
            }

            const updateData: any = {
                approved: approvalDecision === 'approve',
                approval_notes: approvalNotes,
                approved_by: userId,
                approved_at: new Date().toISOString()
            };

            let endpoint = '';
            let successMessage = '';

            switch (approvalType) {
                case 'inspection':
                    endpoint = `/api/projects/${projectId}/closure/inspection/approve`;
                    successMessage = `Inspection ${approvalDecision === 'approve' ? 'approved' : 'rejected'} successfully`;
                    break;
                case 'handover':
                    endpoint = `/api/projects/${projectId}/closure/handover/approve`;
                    successMessage = `Handover ${approvalDecision === 'approve' ? 'approved' : 'rejected'} successfully`;
                    break;
                case 'closeout':
                    endpoint = `/api/projects/${projectId}/closure/approve`;
                    successMessage = `Project closure ${approvalDecision === 'approve' ? 'approved' : 'rejected'} successfully`;
                    break;
            }

            const response = await axios.post(endpoint, updateData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (response.status === 200) {
                toast.success(successMessage);
                fetchProject();
                setShowApprovalModal(false);
                setApprovalNotes("");
                setApprovalDecision('approve');
            }
        } catch (error) {
            console.error("Error processing approval:", error);
            toast.error("Failed to process approval");
        }
    };

    const openApprovalModal = (type: 'inspection' | 'handover' | 'closeout') => {
        setApprovalType(type);
        setShowApprovalModal(true);
    };

    const handleDownloadPDFReport = async () => {
        if (!projectId) return;

        setIsGeneratingPDF(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/closure/report`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF report');
            }

            // Get the blob and create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${project?.name || 'Project'}_Closure_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Mark report checklist as complete after successful download
            try {
                const completeResponse = await fetch(`/api/projects/${projectId}/closure/report/complete`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (completeResponse.ok) {
                    const completeData = await completeResponse.json();
                    if (completeData.projectClosed) {
                        toast.success("PDF closure report downloaded successfully! Project is now officially closed.");
                    } else {
                        toast.success("PDF closure report downloaded and marked as complete!");
                    }
                    // Refresh project data to show updated status
                    fetchProject();
                } else {
                    toast.success("PDF closure report downloaded successfully!");
                    console.warn("Failed to mark report as complete, but download succeeded");
                }
            } catch (completeError) {
                console.error("Error marking report as complete:", completeError);
                toast.success("PDF closure report downloaded successfully!");
            }
        } catch (error) {
            console.error("Error downloading PDF report:", error);
            toast.error("Failed to download PDF report. Please try again.");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <DashboardLayout>
                    <div className="flex items-center justify-center h-64">
                        <Spinner size={32} className="text-bright-primary" />
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    if (!project) {
        return (
            <ProtectedRoute>
                <DashboardLayout>
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-semibold text-ink mb-4">
                            Project Not Found
                        </h2>
                        <button
                            onClick={() => router.push("/projects")}
                            className={actionPrimary}
                        >
                            Back to Projects
                        </button>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <DashboardLayout
                title="Project Closure Management"
                backHref={`/projects/${projectId}`}
                backLabel="Back to Project"
                subtitle={
                    <span className="inline-flex items-center gap-1.5">
                        {project.name}
                        <span aria-hidden="true" className="text-faint">&middot;</span>
                        <EntityCode code={project.project_code} />
                    </span>
                }
                actions={
                    <StatusBadge
                        label={CLOSURE_STATUS[project.status]?.label ?? "In progress"}
                        tone={CLOSURE_STATUS[project.status]?.tone ?? "neutral"}
                    />
                }
            >
                <Breadcrumb
                    className="mb-5"
                    items={[
                        { label: "Projects", href: "/projects" },
                        { label: project.name, href: `/projects/${projectId}` },
                        { label: "Closure" },
                    ]}
                />

                {/* Closure progress.
                    The previous treatment filled a full-width block with solid
                    success green before any step was complete, so a 0/7 project
                    read as a finished one at a glance. Progress now stays
                    neutral until it is actually earned, and the figure carries
                    the colour rather than the whole panel. */}
                {project.status === 'completed' && project.closure_checklists && project.closure_checklists.length > 0 && (() => {
                    const total = project.closure_checklists.length;
                    const done = project.closure_checklists.filter(i => i.status === 'complete').length;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    const complete = pct === 100;

                    return (
                        <section
                            aria-labelledby="closure-progress-heading"
                            className="mb-6 rounded-xl border border-line bg-surface p-6"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-3">
                                <h2
                                    id="closure-progress-heading"
                                    className="font-display text-[15px] font-semibold text-ink"
                                >
                                    Closure Progress
                                </h2>
                                <p className="text-[13px] text-muted">
                                    <span className={`text-[15px] font-semibold tabular-nums ${complete ? 'text-success' : 'text-ink'}`}>
                                        {done}
                                    </span>
                                    <span className="tabular-nums"> / {total}</span>
                                    {" "}steps complete
                                </p>
                            </div>

                            <div
                                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-3"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-labelledby="closure-progress-heading"
                            >
                                <div
                                    className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${complete ? 'bg-success' : 'bg-bright'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>

                            <p className="mt-2 text-[12.5px] text-muted">
                                <span className="font-medium tabular-nums text-ink">{pct}%</span>
                                {" "}overall
                                {!complete && nextStep && (
                                    <> &middot; next up: <span className="text-ink">{nextStep.label}</span></>
                                )}
                            </p>
                        </section>
                    );
                })()}

                {/* Workflow steps.
                    The row is the underline `TabRow` rather than the filled
                    orange chips it replaced: brand orange is reserved for
                    primary actions and the active nav item, and a row of solid
                    orange chips competed with both. The pulsing dot each tab
                    carried is gone too — it fired on every tab at once, so it
                    marked nothing in particular while animating indefinitely. */}
                <TabRow
                    value={activeSection}
                    onChange={setActiveSection}
                    tabs={visibleTabs.map((tab) => ({
                        id: tab.id,
                        label: tab.label,
                        icon: tab.icon,
                    }))}
                />

                {/* Content */}
                <div className="space-y-6">
                    {/* Locked Content Component */}
                    {(() => {
                        const sectionToTypeMap: { [key: string]: string } = {
                            'inspection': 'inspection',
                            'punch-create': 'create_punch_list',
                            'punch-resolve': 'punch_list',
                            'documents': 'documents',
                            'handover': 'handover',
                            'approvals': 'approval',
                            'reports': 'manual'
                        };

                        const stepType = sectionToTypeMap[activeSection];
                        if (stepType && !isStepAccessible(stepType) && activeSection !== 'checklist') {
                            const nextStep = getNextRequiredStep();
                            return (
                                <div className="bg-surface border border-line rounded-xl p-8">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle className="w-8 h-8 text-faint" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-ink mb-2">
                                            Section Locked
                                        </h3>
                                        <p className="text-muted mb-4">
                                            This section is not yet accessible. Please complete the previous steps in order.
                                        </p>
                                        {nextStep && (
                                            <div className="bg-bright-soft rounded-lg p-4 mb-4">
                                                <p className="text-sm text-bright">
                                                    <strong>Next Required Step:</strong> {nextStep.label}
                                                </p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setActiveSection('checklist')}
                                            className={`${actionPrimary} mx-auto`}
                                        >
                                            <CheckCircle size={16} />
                                            <span>View Checklist Overview</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Only show content if step is accessible or it's the overview */}
                    {(activeSection === 'checklist' || 
                      (activeSection !== 'checklist' && 
                       isStepAccessible(
                           { 'inspection': 'inspection', 'punch-create': 'create_punch_list', 'punch-resolve': 'punch_list', 
                             'documents': 'documents', 'handover': 'handover', 'approvals': 'approval', 'reports': 'manual' }[activeSection] || ''
                       ))) && (
                    <>
                    {/* Check if project is closed */}
                    {project.status === 'closed' ? (
                        <div className="bg-surface border border-line rounded-xl p-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-12 h-12 text-success" />
                                </div>
                                <h3 className="text-2xl font-bold text-ink mb-4">
                                    Project Successfully Closed
                                </h3>
                                <p className="text-muted mb-6 max-w-2xl mx-auto">
                                    This project has been officially closed and all closure activities have been completed. 
                                    All deliverables have been handed over, documentation has been finalized, and the project is now archived.
                                </p>
                                
                                {/* Closure Summary */}
                                <div className="mb-6 rounded-xl border border-line border-l-[3px] border-l-success bg-surface p-5">
                                    <h4 className="mb-4 font-display text-[14.5px] font-semibold text-ink">
                                        Closure Summary
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        {project.closure_approved_at && (
                                            <div>
                                                <span className="text-success font-medium">Closed Date: </span>
                                                <span className="text-[12.5px] font-medium text-ink">
                                                    {new Date(project.closure_approved_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        {project.closure_approved_user && (
                                            <div>
                                                <span className="text-success font-medium">Closed By: </span>
                                                <span className="text-[12.5px] font-medium text-ink">
                                                    {project.closure_approved_user.account?.first_name} {project.closure_approved_user.account?.last_name}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-success font-medium">Total Checklist Items: </span>
                                            <span className="text-[12.5px] font-medium text-ink">
                                                {project.closure_checklists?.length || 0} (All Completed)
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-success font-medium">Project Duration: </span>
                                            <span className="text-[12.5px] font-medium text-ink">
                                                {Math.ceil((new Date(project.actual_end_date || new Date()).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {project.closure_notes && (
                                        <div className="mt-4 pt-4 border-t border-line">
                                            <span className="text-success font-medium text-sm">Closure Notes: </span>
                                            <p className="text-success text-sm mt-1">
                                                {project.closure_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={() => router.push("/projects")}
                                        className={actionSecondary}
                                    >
                                        <ArrowLeft size={16} />
                                        <span>Back to Projects</span>
                                    </button>
                                    <button
                                        onClick={handleDownloadPDFReport}
                                        disabled={isGeneratingPDF}
                                        className={actionPrimary}
                                    >
                                        {isGeneratingPDF ? (
                                            <>
                                                <Spinner size={16} />
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                <span>Download Closure Report</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Completion Status Grid */}
                                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-2">
                                            <Eye className="w-6 h-6 text-success" />
                                        </div>
                                        <p className="text-sm font-medium text-ink">Inspection</p>
                                        <p className="text-xs text-success">Completed</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FileText className="w-6 h-6 text-success" />
                                        </div>
                                        <p className="text-sm font-medium text-ink">Documents</p>
                                        <p className="text-xs text-success">Submitted</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-2">
                                            <User className="w-6 h-6 text-success" />
                                        </div>
                                        <p className="text-sm font-medium text-ink">Handover</p>
                                        <p className="text-xs text-success">Completed</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-2">
                                            <Download className="w-6 h-6 text-success" />
                                        </div>
                                        <p className="text-sm font-medium text-ink">Report</p>
                                        <p className="text-xs text-success">Generated</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : project.status !== 'completed' ? (
                        <EmptyState
                            icon={Clock}
                            tone="info"
                            title="Closure not yet available"
                            description={
                                <>
                                    The closure workflow opens once this project is marked
                                    <span className="text-ink"> Completed</span>. Until then its
                                    checklist, punch list and handover steps stay locked.
                                </>
                            }
                            action={
                                <Link
                                    href={`/projects/${projectId}`}
                                    className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-soft"
                                >
                                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                    Back to project
                                </Link>
                            }
                        >
                            <div className="flex items-center justify-center gap-2 border-t border-line pt-5 text-[13px] text-muted">
                                Current status
                                <StatusBadge
                                    label={CLOSURE_STATUS[project.status]?.label ?? project.status.replace('_', ' ')}
                                    tone={CLOSURE_STATUS[project.status]?.tone ?? "neutral"}
                                />
                            </div>
                        </EmptyState>
                    ) : !project.closure_checklists || project.closure_checklists.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle}
                            title="Closure not started"
                            description="Starting closure creates the seven-step checklist covering inspection, punch list, documents, handover, approval and the final report."
                            action={
                                <button
                                    onClick={startClosureProcess}
                                    disabled={isStartingClosure}
                                    className="inline-flex h-10 items-center gap-2 rounded-md bg-bright px-4 text-[13px] font-semibold text-white transition-colors hover:bg-bright-deep focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-soft disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isStartingClosure ? (
                                        <Spinner size={16} />
                                    ) : (
                                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                    )}
                                    {isStartingClosure ? "Starting…" : "Start closure process"}
                                </button>
                            }
                        />
                    ) : (
                        <>

                            {/* Closure documents.
                                Mirrors the closure checklist: one numbered row
                                per required document, a rail joining them, and
                                the status carried by a badge rather than by
                                repeated prose. The "Type: …" line under each
                                title is gone — it restated the title, which is
                                itself derived from the type — and so is the
                                "Document not yet uploaded" line, which said
                                exactly what the badge beside it said. */}
                            {activeSection === "documents" && (() => {
                                const docs = project.closure_documents ?? [];
                                const uploaded = docs.filter((d) => d.document).length;

                                const label = (type: string) =>
                                    type
                                        .replace(/_/g, " ")
                                        .toLowerCase()
                                        .replace(/\b\w/g, (l) => l.toUpperCase());

                                return (
                                    <section
                                        aria-labelledby="closure-documents-heading"
                                        className="rounded-xl border border-line bg-surface"
                                    >
                                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                                            <div>
                                                <h2
                                                    id="closure-documents-heading"
                                                    className="font-display text-[15px] font-semibold text-ink"
                                                >
                                                    Closure Documents
                                                </h2>
                                                {docs.length > 0 && (
                                                    <p className="mt-0.5 text-[12.5px] text-muted">
                                                        <span className="font-medium tabular-nums text-ink">
                                                            {uploaded}
                                                        </span>
                                                        {" of "}
                                                        <span className="tabular-nums">{docs.length}</span>
                                                        {" uploaded"}
                                                    </p>
                                                )}
                                            </div>

                                            <label
                                                className={`${actionSecondary} cursor-pointer focus-within:ring-[3px] focus-within:ring-bright-soft ${
                                                    bulkUploading ? "pointer-events-none opacity-60" : ""
                                                }`}
                                            >
                                                {bulkUploading ? (
                                                    <Spinner size={16} />
                                                ) : (
                                                    <Upload className="h-4 w-4" aria-hidden="true" />
                                                )}
                                                {bulkUploading ? "Uploading\u2026" : "Bulk upload"}
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                    onChange={handleBulkDocumentUpload}
                                                    className="sr-only"
                                                    disabled={bulkUploading}
                                                />
                                            </label>
                                        </header>

                                        {docs.length === 0 ? (
                                            <div className="p-6">
                                                <EmptyState
                                                    icon={FileText}
                                                    title="No closure documents required"
                                                    description="Nothing has been requested for this project yet. Use bulk upload to add documents."
                                                />
                                            </div>
                                        ) : (
                                            <ol className="divide-y divide-line">
                                                {docs.map((docItem, index) => {
                                                    const has = Boolean(docItem.document);
                                                    const last = index === docs.length - 1;
                                                    const title =
                                                        docItem.document?.name ??
                                                        `${label(docItem.type)} Document`;

                                                    return (
                                                        <li
                                                            key={docItem.id}
                                                            className="relative flex items-start gap-4 px-6 py-4 transition-colors hover:bg-surface-2"
                                                        >
                                                            {!last && (
                                                                <span
                                                                    aria-hidden="true"
                                                                    className={`absolute bottom-0 left-[2.4rem] top-[3.1rem] w-px ${
                                                                        has ? "bg-success/40" : "bg-line"
                                                                    }`}
                                                                />
                                                            )}

                                                            <span
                                                                aria-hidden="true"
                                                                className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11.5px] font-semibold tabular-nums ${
                                                                    has
                                                                        ? "border-success bg-success text-white"
                                                                        : "border-line bg-surface text-muted"
                                                                }`}
                                                            >
                                                                {has ? (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    index + 1
                                                                )}
                                                            </span>

                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="truncate text-[14px] font-medium text-ink">
                                                                    {title}
                                                                </h3>
                                                                <p className="mt-0.5 text-[12.5px] text-muted">
                                                                    {docItem.required ? "Required" : "Optional"}
                                                                    {docItem.notes && ` \u00b7 ${docItem.notes}`}
                                                                </p>
                                                            </div>

                                                            <div className="flex shrink-0 items-center gap-2">
                                                                {/* Uploaded documents show only that they are
                                                                    uploaded. The old badge also had an "Approved"
                                                                    state, but nothing on this screen ever sets
                                                                    `approved`, so that value could not be reached
                                                                    and promised a review step that does not exist
                                                                    here. */}
                                                                <StatusBadge
                                                                    label={has ? "Uploaded" : "Not uploaded"}
                                                                    tone={has ? "success" : "neutral"}
                                                                />

                                                                {!has ? (
                                                                    <label
                                                                        className={`${actionPrimary} cursor-pointer focus-within:ring-[3px] focus-within:ring-bright-soft ${
                                                                            uploadingDocumentItemId === docItem.id
                                                                                ? "pointer-events-none opacity-60"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        {uploadingDocumentItemId === docItem.id ? (
                                                                            <Spinner size={16} />
                                                                        ) : (
                                                                            <Upload
                                                                                className="h-4 w-4"
                                                                                aria-hidden="true"
                                                                            />
                                                                        )}
                                                                        {uploadingDocumentItemId === docItem.id
                                                                            ? "Uploading\u2026"
                                                                            : "Upload"}
                                                                        <input
                                                                            type="file"
                                                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                                            onChange={(e) =>
                                                                                handleFileUpload(docItem.id, e.target.files)
                                                                            }
                                                                            className="sr-only"
                                                                            disabled={uploadingDocumentItemId !== null}
                                                                        />
                                                                    </label>
                                                                ) : (
                                                                    <RowActions>
                                                                        <RowAction
                                                                            icon={Eye}
                                                                            label={`View ${title}`}
                                                                            onClick={() =>
                                                                                docItem.document?.document_id &&
                                                                                window.open(
                                                                                    `/api/documents/download?documentId=${docItem.document.document_id}`,
                                                                                    "_blank",
                                                                                )
                                                                            }
                                                                        />
                                                                        <RowAction
                                                                            icon={Download}
                                                                            label={`Download ${title}`}
                                                                            onClick={() => {
                                                                                const doc = docItem.document;
                                                                                if (!doc?.document_id) return;
                                                                                const a = document.createElement("a");
                                                                                a.href = `/api/documents/download?documentId=${doc.document_id}`;
                                                                                a.download = doc.name || "document";
                                                                                a.rel = "noopener noreferrer";
                                                                                document.body.appendChild(a);
                                                                                a.click();
                                                                                document.body.removeChild(a);
                                                                            }}
                                                                        />
                                                                    </RowActions>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ol>
                                        )}
                                    </section>
                                );
                            })()}

                            {activeSection === "checklist" && (() => {
                                const items = project.closure_checklists ?? [];
                                const activeType = nextStep?.type ?? null;

                                return (
                                    <section
                                        aria-labelledby="closure-checklist-heading"
                                        className="rounded-xl border border-line bg-surface"
                                    >
                                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                                            <h2
                                                id="closure-checklist-heading"
                                                className="font-display text-[15px] font-semibold text-ink"
                                            >
                                                Closure Checklist
                                            </h2>
                                            {nextStep ? (
                                                <p className="text-[13px] text-muted">
                                                    Current step:{" "}
                                                    <span className="font-medium text-ink">{nextStep.label}</span>
                                                </p>
                                            ) : (
                                                <StatusBadge label="All steps complete" tone="success" />
                                            )}
                                        </header>

                                        <ol className="divide-y divide-line">
                                            {items.map((item, index) => {
                                                const complete = item.status === "complete";
                                                const current = !complete && item.type === activeType;
                                                const last = index === items.length - 1;

                                                return (
                                                    <li
                                                        key={item.id}
                                                        aria-current={current ? "step" : undefined}
                                                        className={`relative flex items-start gap-4 px-6 py-4 transition-colors ${
                                                            current ? "bg-bright-soft/40" : "hover:bg-surface-2"
                                                        }`}
                                                    >
                                                        {/* Rail joining one step to the next. Decorative, so it
                                                            is hidden from assistive technology. */}
                                                        {!last && (
                                                            <span
                                                                aria-hidden="true"
                                                                className={`absolute bottom-0 left-[2.4rem] top-[3.1rem] w-px ${
                                                                    complete ? "bg-success/40" : "bg-line"
                                                                }`}
                                                            />
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleChecklistToggle(item.id)}
                                                            disabled={item.auto_checked}
                                                            aria-label={
                                                                complete
                                                                    ? `Mark step ${index + 1}, ${item.title}, as pending`
                                                                    : `Mark step ${index + 1}, ${item.title}, as complete`
                                                            }
                                                            title={
                                                                item.auto_checked
                                                                    ? "Completed automatically when the underlying work finished"
                                                                    : undefined
                                                            }
                                                            className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-soft ${
                                                                complete
                                                                    ? "border-success bg-success text-white"
                                                                    : current
                                                                    ? "border-bright bg-surface text-bright"
                                                                    : "border-line bg-surface text-muted"
                                                            } ${
                                                                item.auto_checked
                                                                    ? "cursor-not-allowed opacity-80"
                                                                    : "cursor-pointer hover:border-bright"
                                                            }`}
                                                        >
                                                            {complete ? (
                                                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                                            ) : (
                                                                index + 1
                                                            )}
                                                        </button>

                                                        <div className="min-w-0 flex-1">
                                                            <h3
                                                                className={`text-[14px] font-medium ${
                                                                    current ? "text-bright-deep" : "text-ink"
                                                                }`}
                                                            >
                                                                {item.title}
                                                            </h3>
                                                            <p className="mt-0.5 text-[12.5px] text-muted">
                                                                {complete && item.completed_at ? (
                                                                    <>
                                                                        Completed{" "}
                                                                        {new Date(item.completed_at).toLocaleDateString()}
                                                                        {item.completedBy &&
                                                                            ` by ${item.completedBy.account.first_name} ${item.completedBy.account.last_name}`}
                                                                    </>
                                                                ) : current ? (
                                                                    "Complete this step to continue."
                                                                ) : complete ? (
                                                                    "Completed"
                                                                ) : (
                                                                    `Step ${index + 1} of ${items.length}`
                                                                )}
                                                                {item.auto_checked && " \u00b7 tracked automatically"}
                                                            </p>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-2">
                                                            {item.type === "inspection" &&
                                                                item.status === "pending" &&
                                                                !project.final_inspection && (
                                                                    <button
                                                                        onClick={() => setShowScheduleInspectionModal(true)}
                                                                        className={actionPrimary}
                                                                    >
                                                                        <Calendar className="h-4 w-4" aria-hidden="true" />
                                                                        Schedule
                                                                    </button>
                                                                )}
                                                            <StatusBadge
                                                                label={
                                                                    complete ? "Complete" : current ? "In progress" : "Pending"
                                                                }
                                                                tone={complete ? "success" : current ? "brand" : "neutral"}
                                                            />
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </section>
                                );
                            })()}

                            {/* Create Punch Items Section */}
                            {activeSection === "punch-create" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-ink">
                                            Create Punch List Items
                                        </h3>
                                        <button
                                            onClick={() => setShowAddPunchItemModal(true)}
                                            className={actionPrimary}
                                        >
                                            <Plus size={16} />
                                            <span>Add New Item</span>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {project.punch_list_items?.filter(item => item.status === 'open').map((item) => (
                                            <div
                                                key={item.id}
                                                className="border border-line rounded-lg p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-4">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center mt-1 bg-danger text-white">
                                                            <AlertTriangle size={12} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-ink">
                                                                {item.title}
                                                            </h4>
                                                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted">
                                                                {item.assignee && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <User size={14} />
                                                                        <span>{item.assignee.account.first_name} {item.assignee.account.last_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center space-x-1">
                                                                    {/* TO DO get the assigend user or migrate a created at for the punch item table
                                                                     <Clock size={14} />
                                                                    <span>Created {new Date(item.created_at).toLocaleDateString()}</span> */}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold bg-danger-soft text-danger">
                                                            Open
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPunchItem(item);
                                                                setPunchItemForm({
                                                                    title: item.title,
                                                                    assignee_id: item.assigned_to?.toString() || "",
                                                                });
                                                                setShowEditPunchItemModal(true);
                                                            }}
                                                            className="p-1 text-info hover:bg-info-soft rounded transition-colors"
                                                            title="Edit item"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePunchItem(item.id)}
                                                            className="p-1 text-danger hover:bg-danger-soft rounded transition-colors"
                                                            title="Delete item"
                                                            aria-label="Delete punch list item"
                                                        >
                                                            <Trash2 size={16} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!project.punch_list_items?.filter(item => item.status === 'open').length) && (
                                            <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                                                <Plus className="w-12 h-12 text-faint mx-auto mb-3" />
                                                <p className="text-muted mb-4">
                                                    No open punch list items. Create new items that need to be addressed before project closure.
                                                </p>
                                                <button
                                                    onClick={() => setShowAddPunchItemModal(true)}
                                                    className={`${actionPrimary} mx-auto`}
                                                >
                                                    <Plus size={16} />
                                                    <span>Create First Item</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Submit Button for Punch List Creation */}
                                    {(project.punch_list_items?.filter(item => item.status === 'open').length || 0) > 0 && 
                                     !project.closure_checklists?.find(item => item.type === 'punch_list' && item.status === 'complete') && (
                                        <div className="mt-6 pt-6 border-t border-line">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-muted">
                                                        Ready to submit punch list creation? This will mark the punch list checklist item as complete.
                                                    </p>
                                                    <p className="text-xs text-muted mt-1">
                                                        You can still add more items later if needed.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleCompletePunchListCreation}
                                                    className={actionPrimary}
                                                >
                                                    <CheckCircle size={16} />
                                                    <span>Complete Punch List Creation</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Resolve Punch Items Section */}
                            {activeSection === "punch-resolve" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-ink">
                                            Resolve Punch List Items
                                        </h3>
                                        <div className="flex items-center space-x-4 text-sm">
                                            <span className="text-muted">
                                                Total: {project.punch_list_items?.length || 0}
                                            </span>
                                            <span className="text-[12.5px] font-medium text-ink">
                                                Resolved: {project.punch_list_items?.filter(item => item.status === 'resolved').length || 0}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {project.punch_list_items?.filter(item => item.status !== 'open').map((item) => (
                                            <div
                                                key={item.id}
                                                className="border border-line rounded-lg p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-4">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                                                            item.status === 'resolved' 
                                                                ? 'bg-success text-white' 
                                                                : 'bg-info text-white'
                                                        }`}>
                                                            {item.status === 'resolved' && <CheckCircle size={12} />}
                                                            {item.status === 'in_progress' && <Clock size={12} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-ink">
                                                                {item.title}
                                                            </h4>
                                                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted">
                                                                {item.assignee && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <User size={14} />
                                                                        <span>{item.assignee.account.first_name} {item.assignee.account.last_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center space-x-1">
                                                                   {/* TO DO: add the assigned user or migrate a created at for the punch item table 
                                                                    <Clock size={14} />
                                                                    <span>Created {new Date(item.created_at).toLocaleDateString()}</span> */}
                                                                </div>
                                                                {item.resolved_at && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <CheckCircle size={14} />
                                                                        <span>Resolved {new Date(item.resolved_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <StatusBadge
                                                            label={item.status === 'resolved' ? 'Resolved' : 'In progress'}
                                                            tone={item.status === 'resolved' ? 'success' : 'brand'}
                                                        />
                                                        {/* Resolving is the only move available from here, so it
                                                            is a button rather than a select. The dropdown this
                                                            replaced listed "In Progress" alongside "Mark as
                                                            Resolved" — choosing the state the item was already
                                                            in did nothing, and presenting a no-op beside a real
                                                            action makes the real one harder to find. */}
                                                        {item.status !== 'resolved' && (
                                                            <button
                                                                onClick={() => handleUpdatePunchItem(item.id, 'resolved')}
                                                                className={actionSecondary}
                                                            >
                                                                <Check className="h-4 w-4" aria-hidden="true" />
                                                                Mark as resolved
                                                            </button>
                                                        )}
                                                        {item.status === 'resolved' && (
                                                            <button
                                                                onClick={() => handleDeletePunchItem(item.id)}
                                                                className="p-1 text-danger hover:bg-danger-soft rounded transition-colors"
                                                                title="Delete resolved item"
                                                                aria-label="Delete resolved punch list item"
                                                            >
                                                                <Trash2 size={16} aria-hidden="true" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Show items that need to be moved to resolution */}
                                        {project.punch_list_items?.filter(item => item.status === 'open').map((item) => (
                                            <div
                                                key={item.id}
                                                className="border border-bright rounded-lg p-4 bg-bright-soft"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start space-x-4">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center mt-1 bg-bright text-white">
                                                            <AlertTriangle size={12} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-ink">
                                                                {item.title}
                                                            </h4>
                                                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted">
                                                                {item.assignee && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <User size={14} />
                                                                        <span>{item.assignee.account.first_name} {item.assignee.account.last_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center space-x-1">
                                                                    <Clock size={14} />
                                                                    <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold bg-bright-soft text-bright">
                                                            Ready to Start
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdatePunchItem(item.id, 'in_progress')}
                                                            className={actionSecondary}
                                                        >
                                                            Start Working
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {(!project.punch_list_items || project.punch_list_items.length === 0) && (
                                            <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                                                <AlertTriangle className="w-12 h-12 text-faint mx-auto mb-3" />
                                                <p className="text-muted">
                                                    No punch list items to resolve yet. Create items in the "Create Punch Items" tab first.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Inspection Section */}
                            {activeSection === "inspection" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-ink mb-6">
                                        Final Inspection
                                    </h3>
                                    
                                    {!project.final_inspection ? (
                                        <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                                            <Eye className="w-12 h-12 text-faint mx-auto mb-3" />
                                            <p className="text-muted mb-4">
                                                No inspection scheduled yet. Schedule the final inspection to proceed with the closure process.
                                            </p>
                                            <button
                                                onClick={() => setShowScheduleInspectionModal(true)}
                                                className={`${actionPrimary} mx-auto`}
                                            >
                                                <Calendar size={16} />
                                                <span>Schedule Inspection</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Inspection Details */}
                                            <DetailPanel
                                                title="Inspection Details"
                                                tone={
                                                    project.final_inspection.status === "completed"
                                                        ? "success"
                                                        : "brand"
                                                }
                                                status={
                                                    <StatusBadge
                                                        label={
                                                            project.final_inspection.status === "completed"
                                                                ? "Completed"
                                                                : project.final_inspection.status === "in_progress"
                                                                ? "In progress"
                                                                : "Scheduled"
                                                        }
                                                        tone={
                                                            project.final_inspection.status === "completed"
                                                                ? "success"
                                                                : project.final_inspection.status === "in_progress"
                                                                ? "brand"
                                                                : "warning"
                                                        }
                                                    />
                                                }
                                                rows={[
                                                    {
                                                        label: "Scheduled date",
                                                        value: new Date(
                                                            project.final_inspection.scheduled_date,
                                                        ).toLocaleDateString(),
                                                    },
                                                    {
                                                        label: "Scheduled time",
                                                        value: project.final_inspection.scheduled_time,
                                                    },
                                                    ...(project.final_inspection.inspector
                                                        ? [
                                                              {
                                                                  label: "Inspector",
                                                                  value: `${project.final_inspection.inspector.account?.first_name ?? ""} ${project.final_inspection.inspector.account?.last_name ?? ""}`.trim(),
                                                              },
                                                          ]
                                                        : []),
                                                    ...(project.final_inspection.submitted_at
                                                        ? [
                                                              {
                                                                  label: "Submitted",
                                                                  value: new Date(
                                                                      project.final_inspection.submitted_at,
                                                                  ).toLocaleDateString(),
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />

                                            {/* Inspection Notes */}
                                            {project.final_inspection.notes && (
                                                <div className="bg-surface-2 rounded-lg p-4">
                                                    <h4 className="font-semibold text-ink mb-2">
                                                        Inspection Notes
                                                    </h4>
                                                    <p className="text-ink-3 whitespace-pre-wrap">
                                                        {project.final_inspection.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Inspection Documents */}
                                            {project.final_inspection.documents && (
                                                <div className="bg-surface-2 rounded-lg p-4">
                                                    <h4 className="font-semibold text-ink mb-2">
                                                        Inspection Documents
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {JSON.parse(project.final_inspection.documents).map((doc: any, index: number) => (
                                                            <div key={index} className="flex items-center space-x-2 p-2 bg-surface rounded border">
                                                                <FileText size={16} className="text-info" />
                                                                <span className="text-sm text-ink-3">{doc.name}</span>
                                                                <button
                                                                  aria-label="Download document" className="ml-auto p-1 text-info hover:bg-info-soft rounded">
                                                                    <Download size={14} aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            {project.final_inspection.status !== 'completed' && (
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => setShowInspectionDetailsModal(true)}
                                                        className={actionPrimary}
                                                    >
                                                        <Edit size={16} />
                                                        <span>Add Notes & Documents</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Handover Section */}
                            {activeSection === "handover" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-ink mb-6">
                                        Project Handover
                                    </h3>
                                    
                                    {!project.handover ? (
                                        <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                                            <User className="w-12 h-12 text-faint mx-auto mb-3" />
                                            <p className="text-muted mb-4">
                                                No handover scheduled yet. Schedule the project handover to transfer ownership and complete the closure process.
                                            </p>
                                            <button
                                                onClick={() => setShowScheduleHandoverModal(true)}
                                                className={`${actionPrimary} mx-auto`}
                                            >
                                                <Calendar size={16} />
                                                <span>Schedule Handover</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <DetailPanel
                                                title="Handover Details"
                                                tone={
                                                    project.handover.status === "completed"
                                                        ? "success"
                                                        : "brand"
                                                }
                                                status={
                                                    <StatusBadge
                                                        label={
                                                            project.handover.status === "completed"
                                                                ? "Completed"
                                                                : "Scheduled"
                                                        }
                                                        tone={
                                                            project.handover.status === "completed"
                                                                ? "success"
                                                                : "warning"
                                                        }
                                                    />
                                                }
                                                rows={[
                                                    {
                                                        label: "Handover date",
                                                        value: new Date(
                                                            project.handover.handover_date,
                                                        ).toLocaleDateString(),
                                                    },
                                                    {
                                                        label: "Handover time",
                                                        value: project.handover.handover_time,
                                                    },
                                                    {
                                                        label: "Handed over by",
                                                        value: `${project.handover.handover_user?.account?.first_name ?? ""} ${project.handover.handover_user?.account?.last_name ?? ""}`.trim() || "\u2014",
                                                    },
                                                    {
                                                        label: "Handed over to",
                                                        value: project.handover.handed_over_to || "\u2014",
                                                    },
                                                    ...(project.handover.submitted_at
                                                        ? [
                                                              {
                                                                  label: "Completed at",
                                                                  value: new Date(
                                                                      project.handover.submitted_at,
                                                                  ).toLocaleDateString(),
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />

                                            {/* Handover Notes */}
                                            {project.handover.notes && (
                                                <div className="bg-surface-2 rounded-lg p-4">
                                                    <h4 className="font-semibold text-ink mb-2">
                                                        Handover Notes
                                                    </h4>
                                                    <p className="text-ink-3 whitespace-pre-wrap">
                                                        {project.handover.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Handover Receipt */}
                                            {project.handover.handover_receipt && (
                                                <div className="bg-surface-2 rounded-lg p-4">
                                                    <h4 className="font-semibold text-ink mb-2">
                                                        Handover Receipt
                                                    </h4>
                                                    <div className="flex items-center space-x-2 p-2 bg-surface rounded border">
                                                        <FileText size={16} className="text-accent-violet" />
                                                        <span className="text-sm text-ink-3">
                                                            {project.handover.handover_receipt.name}
                                                        </span>
                                                        <button
                                                          aria-label="Download document" className="ml-auto p-1 text-accent-violet hover:bg-accent-violet-soft rounded">
                                                            <Download size={14} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex justify-between">
                                                <div className="flex space-x-3">
                                                    {project.handover.status !== 'completed' && (
                                                        <button
                                                            onClick={() => setShowHandoverDetailsModal(true)}
                                                            className={actionPrimary}
                                                        >
                                                            <Edit size={16} />
                                                            <span>Complete Handover</span>
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {project.handover.status === 'completed' && !project.handover.handover_receipt && (
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                            onChange={(e) => setHandoverReceiptFile(e.target.files?.[0] || null)}
                                                            className="hidden"
                                                            id="handover-receipt-upload"
                                                        />
                                                        <label
                                                            htmlFor="handover-receipt-upload"
                                                            className={`${actionPrimary} cursor-pointer`}
                                                        >
                                                            <Upload size={16} />
                                                            <span>Upload Receipt</span>
                                                        </label>
                                                        {handoverReceiptFile && (
                                                            <button
                                                                onClick={handleUploadHandoverReceipt}
                                                                className={actionPrimary}
                                                            >
                                                                <CheckCircle size={16} />
                                                                <span>Submit Receipt</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {handoverReceiptFile && (
                                                <div className="bg-info-soft rounded-lg p-3">
                                                    <p className="mb-1 text-[12.5px] text-muted">Selected file</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12.5px] text-muted">{handoverReceiptFile.name}</span>
                                                        <span className="text-[12px] text-muted">
                                                            {(handoverReceiptFile.size / 1024).toFixed(1)}KB
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Approvals Section */}
                            {activeSection === "approvals" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-ink mb-6">
                                        Project Closure Approvals
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        {/* Final Inspection Approval */}
                                        <div className="rounded-xl border border-line border-l-[3px] border-l-info bg-surface p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <Eye className="w-6 h-6 text-info" />
                                                    <div>
                                                        <h4 className="font-display text-[14.5px] font-semibold text-ink">
                                                            Final Inspection Approval
                                                        </h4>
                                                        <p className="text-[12.5px] text-muted">
                                                            Review and approve the final inspection results
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {project.final_inspection ? (
                                                        <>
                                                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                                                                project.final_inspection.approved
                                                                    ? 'bg-success-soft text-success  '
                                                                    : project.final_inspection.submitted_at
                                                                    ? 'bg-warning-soft text-warning  '
                                                                    : 'bg-surface-2 text-ink-2  '
                                                            }`}>
                                                                {project.final_inspection.approved 
                                                                    ? 'Approved' 
                                                                    : project.final_inspection.submitted_at 
                                                                    ? 'Pending Approval' 
                                                                    : 'Not Submitted'}
                                                            </span>
                                                            {project.final_inspection.submitted_at && !project.final_inspection.approved && (
                                                                <button
                                                                    onClick={() => openApprovalModal('inspection')}
                                                                    className={actionPrimary}
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    <span>Review & Approve</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold bg-surface-2 text-ink-2">
                                                            No Inspection Scheduled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {project.final_inspection?.approved && project.final_inspection.approver && (
                                                <div className="mt-4 pt-4 border-t border-line">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>
                                                            <span className="text-[12.5px] text-muted">Approved by </span>
                                                            <span className="text-[12.5px] font-medium text-ink">
                                                                {project.final_inspection.approver.account?.first_name} {project.final_inspection.approver.account?.last_name}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[12.5px] text-muted">Approved on </span>
                                                            <span className="text-[12.5px] font-medium text-ink">
                                                                {new Date(project.final_inspection.approved_at!).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {project.final_inspection.approval_notes && (
                                                        <div className="mt-2">
                                                            <span className="text-[12.5px] text-muted">Notes </span>
                                                            <span className="text-[12.5px] text-ink">
                                                                {project.final_inspection.approval_notes}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Handover Approval */}
                                        <div className="rounded-xl border border-line border-l-[3px] border-l-accent-violet bg-surface p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <User className="w-6 h-6 text-accent-violet" />
                                                    <div>
                                                        <h4 className="font-display text-[14.5px] font-semibold text-ink">
                                                            Handover Approval
                                                        </h4>
                                                        <p className="text-[12.5px] text-muted">
                                                            Review and approve the project handover
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {project.handover ? (
                                                        <>
                                                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                                                                project.handover.approved_at
                                                                    ? 'bg-success-soft text-success  '
                                                                    : project.handover.submitted_at
                                                                    ? 'bg-warning-soft text-warning  '
                                                                    : 'bg-surface-2 text-ink-2  '
                                                            }`}>
                                                                {project.handover.approved_at 
                                                                    ? 'Approved' 
                                                                    : project.handover.submitted_at 
                                                                    ? 'Pending Approval' 
                                                                    : 'Not Submitted'}
                                                            </span>
                                                            {project.handover.submitted_at && !project.handover.approved_at && (
                                                                <button
                                                                    onClick={() => openApprovalModal('handover')}
                                                                    className={actionPrimary}
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    <span>Review & Approve</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold bg-surface-2 text-ink-2">
                                                            No Handover Scheduled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {project.handover?.approved_at && project.handover.approver && (
                                                <div className="mt-4 pt-4 border-t border-line">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>
                                                            <span className="text-[12.5px] text-muted">Approved by </span>
                                                            <span className="text-[12.5px] font-medium text-ink">
                                                                {project.handover.approver.account?.first_name} {project.handover.approver.account?.last_name}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[12.5px] text-muted">Approved on </span>
                                                            <span className="text-[12.5px] font-medium text-ink">
                                                                {new Date(project.handover.approved_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Project Closure Approval */}
                                        <div className="rounded-xl border border-line border-l-[3px] border-l-success bg-surface p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-6 h-6 text-success" />
                                                    <div>
                                                        <h4 className="font-display text-[14.5px] font-semibold text-ink">
                                                            Project Closure Approval
                                                        </h4>
                                                        <p className="text-[12.5px] text-muted">
                                                            Final approval to officially close the project
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {/* Check if all prerequisites are met */}
                                                    {project.final_inspection?.approved && project.handover?.approved_at ? (
                                                        <>
                                                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                                                                project.closure_approved_at
                                                                    ? 'bg-success-soft text-success  '
                                                                    : 'bg-warning-soft text-warning  '
                                                            }`}>
                                                                {project.closure_approved_at ? 'Project Closed' : 'Ready for Closure'}
                                                            </span>
                                                            {!project.closure_approved_at && (
                                                                <button
                                                                    onClick={() => openApprovalModal('closeout')}
                                                                    className={actionPrimary}
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    <span>Close Project</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center">
                                                            <span className="inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold bg-surface-2 text-ink-2">
                                                                Prerequisites Not Met
                                                            </span>
                                                            <p className="text-xs text-muted mt-1">
                                                                Inspection and handover must be approved first
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {project.closure_approved_at && project.closure_approved_by && (
                                                <div className="mt-4 pt-4 border-t border-line">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>                                            <span className="text-success">Closed by: </span>
                                            <span className="text-[12.5px] font-medium text-ink">
                                                {project.closure_approved_user?.account?.first_name} {project.closure_approved_user?.account?.last_name}
                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-success">Closed on: </span>
                                                            <span className="text-[12.5px] font-medium text-ink">
                                                                {new Date(project.closure_approved_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {project.closure_notes && (
                                                        <div className="mt-2">
                                                            <span className="text-[12.5px] text-muted">Notes </span>
                                                            <span className="text-[12.5px] text-ink">
                                                                {project.closure_notes}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Overall Progress Summary */}
                                        <div className="bg-surface-2 rounded-lg p-6">
                                            <h4 className="font-semibold text-ink mb-4">
                                                Closure Progress Summary
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="text-center">
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                                                        project.final_inspection?.approved 
                                                            ? 'bg-success-soft text-success  '
                                                            : 'bg-surface-2 text-faint  '
                                                    }`}>
                                                        <Eye size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-ink">Inspection</p>
                                                    <p className="text-xs text-muted">
                                                        {project.final_inspection?.approved ? 'Approved' : 'Pending'}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                                                        project.handover?.approved_at 
                                                            ? 'bg-success-soft text-success  '
                                                            : 'bg-surface-2 text-faint  '
                                                    }`}>
                                                        <User size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-ink">Handover</p>
                                                    <p className="text-xs text-muted">
                                                        {project.handover?.approved_at ? 'Approved' : 'Pending'}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                                                        project.closure_approved_at 
                                                            ? 'bg-success-soft text-success  '
                                                            : 'bg-surface-2 text-faint  '
                                                    }`}>
                                                        <CheckCircle size={24} />
                                                    </div>
                                                    <p className="text-sm font-medium text-ink">Closure</p>
                                                    <p className="text-xs text-muted">
                                                        {project.closure_approved_at ? 'Closed' : 'Pending'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reports Section */}
                            {activeSection === "reports" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-ink mb-6">
                                        Project Closure Reports
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        {/* PDF Closure Report */}
                                        <div className="rounded-xl border border-line border-l-[3px] border-l-info bg-surface p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <FileText className="w-6 h-6 text-info" />
                                                    <div>
                                                        <h4 className="font-display text-[14.5px] font-semibold text-ink">
                                                            Comprehensive Closure Report
                                                        </h4>
                                                        <p className="text-[12.5px] text-muted">
                                                            Generate and download a complete project closure report
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {/* Show checklist status */}
                                                    {(() => {
                                                        const reportChecklistItem = project.closure_checklists?.find(
                                                            item => item.type === 'manual' && item.title.includes('Final Report')
                                                        );
                                                        return reportChecklistItem?.status === 'complete' ? (
                                                            <span className="inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold bg-success-soft text-success">
                                                                Downloaded
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                    <button
                                                        onClick={handleDownloadPDFReport}
                                                        disabled={isGeneratingPDF}
                                                        className={actionPrimary}
                                                    >
                                                        {isGeneratingPDF ? (
                                                            <>
                                                                <Spinner size={16} />
                                                                <span>Generating...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Download size={16} />
                                                                <span>Download PDF</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="rounded-lg border border-line bg-surface-2 p-4">
                                                <h5 className="mb-2 text-[13px] font-semibold text-ink">
                                                    Report Contents:
                                                </h5>
                                                <ul className="space-y-1 text-[12.5px] text-muted">
                                                    <li>• Project overview and basic information</li>
                                                    <li>• Team composition and roles</li>
                                                    <li>• Work Breakdown Structure (WBS) and tasks</li>
                                                    <li>• Project timeline and milestones</li>
                                                    <li>• Budget summary and financial metrics</li>
                                                    <li>• Performance metrics (CPI, SPI, Health Index)</li>
                                                    <li>• Risk analysis and mitigation strategies</li>
                                                    <li>• Resource utilization and assignments</li>
                                                    <li>• Closure checklist status</li>
                                                    <li>• Document inventory and uploads</li>
                                                    <li>• Punch list items and resolutions</li>
                                                    <li>• Final inspection and handover details</li>
                                                    <li>• Lessons learned and recommendations</li>
                                                    <li>• Approval history and signatures</li>
                                                </ul>
                                            </div>

                                            {/* Show download info */}
                                            {(() => {
                                                const reportChecklistItem = project.closure_checklists?.find(
                                                    item => item.type === 'manual' && item.title.includes('Final Report')
                                                );
                                                return reportChecklistItem?.status === 'complete' && reportChecklistItem.completed_at ? (
                                                    <div className="mt-4 pt-4 border-t border-line">
                                                        <div className="flex items-center space-x-2 text-sm text-info">
                                                            <CheckCircle size={16} />
                                                            <span>Report downloaded on {new Date(reportChecklistItem.completed_at).toLocaleDateString()}</span>
                                                            {reportChecklistItem.completedBy && (
                                                                <span>by {reportChecklistItem.completedBy.account.first_name} {reportChecklistItem.completedBy.account.last_name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 pt-4 border-t border-line">
                                                        <div className="flex items-center space-x-2 text-sm text-info">
                                                            <Clock size={16} />
                                                            <span>Click "Download PDF" to generate and download the report. This will mark the checklist item as complete.</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {project.closure_approved_at && (
                                                <div className="mt-4 pt-4 border-t border-line">
                                                    <div className="flex items-center space-x-2 text-sm text-info">
                                                        <CheckCircle size={16} />
                                                        <span>Project officially closed on {new Date(project.closure_approved_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Additional Reports Section */}
                                        <div className="bg-surface-2 rounded-lg p-6">
                                            <h4 className="font-semibold text-ink mb-4">
                                                Additional Reports
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-surface rounded-lg p-4 border border-line">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <FileText className="w-5 h-5 text-muted" />
                                                        <h5 className="font-medium text-ink">
                                                            Checklist Summary
                                                        </h5>
                                                    </div>
                                                    <p className="text-sm text-muted">
                                                        Complete checklist status report
                                                    </p>
                                                    <div className="mt-3 text-xs text-muted">
                                                        {project.closure_checklists?.filter(item => item.status === 'complete').length || 0}/
                                                        {project.closure_checklists?.length || 0} items completed
                                                    </div>
                                                </div>

                                                <div className="bg-surface rounded-lg p-4 border border-line">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <AlertTriangle className="w-5 h-5 text-warning" />
                                                        <h5 className="font-medium text-ink">
                                                            Punch List Report
                                                        </h5>
                                                    </div>
                                                    <p className="text-sm text-muted">
                                                        Summary of punch list items
                                                    </p>
                                                    <div className="mt-3 text-xs text-muted">
                                                        {project.punch_list_items?.filter(item => item.status === 'resolved').length || 0}/
                                                        {project.punch_list_items?.length || 0} items resolved
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    </>
                    )}
                </div>

                {/* Add Punch Item Modal */}
                {showAddPunchItemModal && (
                                        <Modal
                      open
                      onClose={() => setShowAddPunchItemModal(false)}
                      title="Add Punch List Item"
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowAddPunchItemModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="add-punch-item-form"
                                        type="submit"
                                        className={actionPrimary}
                                    >
                                        Add Item
                                    </button></>}
                    >
                      <form id="add-punch-item-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleAddPunchItem();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={punchItemForm.title}
                                        onChange={(e) => setPunchItemForm(prev => ({ ...prev, title: e.target.value }))}
                                        className={inputClass}
                                        placeholder="Enter punch item title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Assignee
                                    </label>
                                    <Dropdown
                                      value={String(punchItemForm.assignee_id ?? '')}
                                      onChange={(__v: string) => setPunchItemForm(prev => ({ ...prev, assignee_id: __v }))}
                                      options={[
                                      { value: String(""), label: "Select assignee (optional)" },
                                      ...(project.team_members?.map((member) => ({ value: String(member.user.user_id), label: `${member.user.account.first_name} ${member.user.account.last_name}` })) ?? []),
                                    ]}
                                    />
                                </div>
</form>
                    </Modal>
                )}

                {/* Edit Punch Item Modal */}
                {showEditPunchItemModal && (
                                        <Modal
                      open
                      onClose={() => setShowEditPunchItemModal(false)}
                      title="Edit Punch List Item"
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowEditPunchItemModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="edit-punch-item-form"
                                        type="submit"
                                        className={actionPrimary}
                                    >
                                        Update Item
                                    </button></>}
                    >
                      <form id="edit-punch-item-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleEditPunchItem();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={punchItemForm.title}
                                        onChange={(e) => setPunchItemForm(prev => ({ ...prev, title: e.target.value }))}
                                        className={inputClass}
                                        placeholder="Enter punch item title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Assignee
                                    </label>
                                    <Dropdown
                                      value={String(punchItemForm.assignee_id ?? '')}
                                      onChange={(__v: string) => setPunchItemForm(prev => ({ ...prev, assignee_id: __v }))}
                                      options={[
                                      { value: String(""), label: "Select assignee (optional)" },
                                      ...(project.team_members?.map((member) => ({ value: String(member.user.user_id), label: `${member.user.account.first_name} ${member.user.account.last_name}` })) ?? []),
                                    ]}
                                    />
                                </div>
</form>
                    </Modal>
                )}

                {/* Schedule Inspection Modal */}
                {showScheduleInspectionModal && (
                                        <Modal
                      open
                      onClose={() => setShowScheduleInspectionModal(false)}
                      title="Schedule Final Inspection"
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowScheduleInspectionModal(false)}
                                        disabled={scheduleInspectionSubmitting}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="schedule-inspection-form"
                                        type="submit"
                                        disabled={scheduleInspectionSubmitting}
                                        className={`${actionPrimary} min-w-[160px]`}
                                    >
                                        {scheduleInspectionSubmitting ? (
                                            <>
                                                <Spinner size={16} />
                                                Scheduling...
                                            </>
                                        ) : (
                                            "Schedule Inspection"
                                        )}
                                    </button></>}
                    >
                      <form id="schedule-inspection-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleScheduleInspection();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Scheduled Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={inspectionForm.scheduled_date}
                                        onChange={(e) => setInspectionForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Scheduled Time *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={inspectionForm.scheduled_time}
                                        onChange={(e) => setInspectionForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                <div ref={inspectorDropdownRef} className="relative">
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Inspector *
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                                        <input
                                            type="text"
                                            value={
                                                inspectionForm.inspector_id && project?.team_members
                                                    ? (() => {
                                                          const m = project.team_members.find((mem) => String(mem.user.user_id) === inspectionForm.inspector_id);
                                                          return m ? `${m.user.account.first_name} ${m.user.account.last_name}` : inspectorSearchQuery;
                                                      })()
                                                    : inspectorSearchQuery
                                            }
                                            onChange={(e) => {
                                                setInspectorSearchQuery(e.target.value);
                                                setInspectorDropdownOpen(true);
                                                if (!e.target.value) setInspectionForm((prev) => ({ ...prev, inspector_id: "" }));
                                            }}
                                            onFocus={() => setInspectorDropdownOpen(true)}
                                            placeholder="Search by name..."
                                            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
                                        />
                                    </div>
                                    {inspectorDropdownOpen && project?.team_members && (
                                        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-line bg-surface shadow-lg py-1">
                                            {project.team_members
                                                .filter(
                                                    (member) =>
                                                        !inspectorSearchQuery.trim() ||
                                                        `${member.user.account.first_name} ${member.user.account.last_name}`
                                                            .toLowerCase()
                                                            .includes(inspectorSearchQuery.trim().toLowerCase())
                                                )
                                                .map((member) => (
                                                    <li
                                                        key={member.user.user_id}
                                                        role="option"
                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-bright-soft text-ink"
                                                        onClick={() => {
                                                            setInspectionForm((prev) => ({ ...prev, inspector_id: String(member.user.user_id) }));
                                                            setInspectorSearchQuery("");
                                                            setInspectorDropdownOpen(false);
                                                        }}
                                                    >
                                                        {member.user.account.first_name} {member.user.account.last_name}
                                                    </li>
                                                ))}
                                            {project.team_members.filter(
                                                (m) =>
                                                    !inspectorSearchQuery.trim() ||
                                                    `${m.user.account.first_name} ${m.user.account.last_name}`
                                                        .toLowerCase()
                                                        .includes(inspectorSearchQuery.trim().toLowerCase())
                                            ).length === 0 && (
                                                <li className="px-3 py-2 text-sm text-muted">No matching inspector</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
</form>
                    </Modal>
                )}

                {/* Inspection Details Modal */}
                {showInspectionDetailsModal && (
                                        <Modal
                      open
                      onClose={() => setShowInspectionDetailsModal(false)}
                      title="Complete Inspection"
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowInspectionDetailsModal(false)}
                                        disabled={inspectionSubmitting}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="update-inspection-form"
                                        type="submit"
                                        disabled={inspectionSubmitting}
                                        className={`${actionPrimary} min-w-[180px]`}
                                    >
                                        {inspectionSubmitting ? (
                                            <>
                                                <Spinner size={16} />
                                                Submitting...
                                            </>
                                        ) : (
                                            "Complete Inspection"
                                        )}
                                    </button></>}
                    >
                      <form id="update-inspection-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleUpdateInspection();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Inspection Notes
                                    </label>
                                    <textarea
                                        value={inspectionNotes}
                                        onChange={(e) => setInspectionNotes(e.target.value)}
                                        rows={4}
                                        className={textareaClass}
                                        placeholder="Enter inspection notes and observations..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Inspection Documents
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => setInspectionDocuments(Array.from(e.target.files || []))}
                                        className={inputClass}
                                    />
                                    <p className="text-xs text-muted mt-1">
                                        Upload photos, documents, or reports from the inspection
                                    </p>
                                </div>

                                {inspectionDocuments.length > 0 && (
                                    <div className="bg-surface-2 rounded-lg p-3">
                                        <h4 className="text-sm font-medium text-ink-3 mb-2">
                                            Selected Files:
                                        </h4>
                                        <div className="space-y-1">
                                            {inspectionDocuments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between text-sm">
                                                    <span className="text-muted">{file.name}</span>
                                                    <span className="text-faint">{(file.size / 1024).toFixed(1)}KB</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
</form>
                    </Modal>
                )}

                {/* Schedule Handover Modal */}
                {showScheduleHandoverModal && (
                                        <Modal
                      open
                      onClose={() => setShowScheduleHandoverModal(false)}
                      title="Schedule Project Handover"
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowScheduleHandoverModal(false)}
                                        disabled={scheduleHandoverSubmitting}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="schedule-handover-form"
                                        type="submit"
                                        disabled={scheduleHandoverSubmitting}
                                        className={`${actionPrimary} min-w-[180px]`}
                                    >
                                        {scheduleHandoverSubmitting ? (
                                            <>
                                                <Spinner size={16} />
                                                Scheduling...
                                            </>
                                        ) : (
                                            "Schedule Handover"
                                        )}
                                    </button></>}
                    >
                      <form id="schedule-handover-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleScheduleHandover();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Handover Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={handoverForm.handover_date}
                                        onChange={(e) => setHandoverForm(prev => ({ ...prev, handover_date: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Handover Time *
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={handoverForm.handover_time}
                                        onChange={(e) => setHandoverForm(prev => ({ ...prev, handover_time: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>

                                <div ref={handoverDropdownRef} className="relative">
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Handed Over By *
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                                        <input
                                            type="text"
                                            value={
                                                handoverForm.handed_over_by && project?.team_members
                                                    ? (() => {
                                                          const m = project.team_members.find((mem) => String(mem.user.user_id) === handoverForm.handed_over_by);
                                                          return m ? `${m.user.account.first_name} ${m.user.account.last_name}` : handoverSearchQuery;
                                                      })()
                                                    : handoverSearchQuery
                                            }
                                            onChange={(e) => {
                                                setHandoverSearchQuery(e.target.value);
                                                setHandoverDropdownOpen(true);
                                                if (!e.target.value) setHandoverForm((prev) => ({ ...prev, handed_over_by: "" }));
                                            }}
                                            onFocus={() => setHandoverDropdownOpen(true)}
                                            placeholder="Search by name..."
                                            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
                                        />
                                    </div>
                                    {handoverDropdownOpen && project?.team_members && (
                                        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-line bg-surface shadow-lg py-1">
                                            {project.team_members
                                                .filter(
                                                    (member) =>
                                                        !handoverSearchQuery.trim() ||
                                                        `${member.user.account.first_name} ${member.user.account.last_name}`
                                                            .toLowerCase()
                                                            .includes(handoverSearchQuery.trim().toLowerCase())
                                                )
                                                .map((member) => (
                                                    <li
                                                        key={member.user.user_id}
                                                        role="option"
                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-bright-soft text-ink"
                                                        onClick={() => {
                                                            setHandoverForm((prev) => ({ ...prev, handed_over_by: String(member.user.user_id) }));
                                                            setHandoverSearchQuery("");
                                                            setHandoverDropdownOpen(false);
                                                        }}
                                                    >
                                                        {member.user.account.first_name} {member.user.account.last_name}
                                                    </li>
                                                ))}
                                            {project.team_members.filter(
                                                (m) =>
                                                    !handoverSearchQuery.trim() ||
                                                    `${m.user.account.first_name} ${m.user.account.last_name}`
                                                        .toLowerCase()
                                                        .includes(handoverSearchQuery.trim().toLowerCase())
                                            ).length === 0 && (
                                                <li className="px-3 py-2 text-sm text-muted">No matching team member</li>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Handed Over To.
                                    Matches the picker above, but stays a free-text
                                    field underneath: `handed_over_to` is a nullable
                                    String holding client or recipient information,
                                    and the recipient is frequently outside the
                                    system. Picking a team member fills the name in;
                                    typing a name that is not on the team is still
                                    accepted. */}
                                <div ref={recipientDropdownRef} className="relative">
                                    <label
                                        htmlFor="handed-over-to"
                                        className="block text-sm font-medium text-ink-3 mb-1"
                                    >
                                        Handed Over To *
                                    </label>
                                    <div className="relative">
                                        <Search
                                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                                            aria-hidden="true"
                                        />
                                        <input
                                            id="handed-over-to"
                                            type="text"
                                            required
                                            role="combobox"
                                            aria-expanded={recipientDropdownOpen}
                                            aria-autocomplete="list"
                                            value={handoverForm.handed_over_to}
                                            onChange={(e) => {
                                                setHandoverForm((prev) => ({
                                                    ...prev,
                                                    handed_over_to: e.target.value,
                                                }));
                                                setRecipientDropdownOpen(true);
                                            }}
                                            onFocus={() => setRecipientDropdownOpen(true)}
                                            placeholder="Search the team, or type a client name"
                                            className={`${inputClass} pl-9`}
                                        />
                                    </div>
                                    {recipientDropdownOpen && project?.team_members && (() => {
                                        const q = handoverForm.handed_over_to.trim().toLowerCase();
                                        const matches = project.team_members.filter(
                                            (m) =>
                                                !q ||
                                                `${m.user.account.first_name} ${m.user.account.last_name}`
                                                    .toLowerCase()
                                                    .includes(q),
                                        );
                                        if (matches.length === 0) return null;
                                        return (
                                            <ul
                                                role="listbox"
                                                className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg"
                                            >
                                                {matches.map((member) => {
                                                    const name = `${member.user.account.first_name} ${member.user.account.last_name}`;
                                                    return (
                                                        <li key={member.user.user_id} role="option" aria-selected={false}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setHandoverForm((prev) => ({
                                                                        ...prev,
                                                                        handed_over_to: name,
                                                                    }));
                                                                    setRecipientDropdownOpen(false);
                                                                }}
                                                                className="w-full cursor-pointer px-3 py-2 text-left text-sm text-ink hover:bg-bright-soft"
                                                            >
                                                                {name}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Initial Notes (Optional)
                                    </label>
                                    <textarea
                                        value={handoverForm.notes}
                                        onChange={(e) => setHandoverForm(prev => ({ ...prev, notes: e.target.value }))}
                                        rows={3}
                                        className={textareaClass}
                                        placeholder="Enter any initial notes for the handover..."
                                    />
                                </div>
</form>
                    </Modal>
                )}

                {/* Handover Details Modal */}
                {showHandoverDetailsModal && (
                                        <Modal
                      open
                      onClose={() => setShowHandoverDetailsModal(false)}
                      title="Complete Handover"
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowHandoverDetailsModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="complete-handover-form"
                                        type="submit"
                                        className={actionPrimary}
                                    >
                                        Complete Handover
                                    </button></>}
                    >
                      <form id="complete-handover-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCompleteHandover();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Handover Completion Notes
                                    </label>
                                    <textarea
                                        value={handoverNotes}
                                        onChange={(e) => setHandoverNotes(e.target.value)}
                                        rows={4}
                                        className={textareaClass}
                                        placeholder="Enter notes about the handover completion, any issues, or additional information..."
                                    />
                                </div>

                                <div className="bg-info-soft rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                        <ExternalLink className="w-4 h-4 text-info mt-0.5" />
                                        <div className="text-sm text-info">
                                            <p className="font-medium mb-1">After completing the handover:</p>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>The handover will be marked as completed</li>
                                                <li>You can upload a handover receipt document</li>
                                                <li>The handover checklist item will be auto-completed</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
</form>
                    </Modal>
                )}

                {/* Approval Modal */}
                {showApprovalModal && (
                                        <Modal
                      open
                      onClose={() => setShowApprovalModal(false)}
                      title={<>{approvalType === 'inspection' && 'Approve Inspection'} {approvalType === 'handover' && 'Approve Handover'} {approvalType === 'closeout' && 'Close Project'}</>}
                      footer={<><button
                                        type="button"
                                        onClick={() => setShowApprovalModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="approval-form"
                                        type="submit"
                                        className={`px-4 py-2 text-white rounded-lg transition-colors ${
                                            approvalDecision === 'approve'
                                                ? 'bg-success hover:opacity-90'
                                                : 'bg-danger hover:opacity-90'
                                        }`}
                                    >
                                        {approvalDecision === 'approve' ? 'Approve' : 'Reject'}
                                    </button></>}
                    >
                      <form id="approval-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApproval();
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Decision
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="decision"
                                                value="approve"
                                                checked={approvalDecision === 'approve'}
                                                onChange={(e) => setApprovalDecision(e.target.value as 'approve' | 'reject')}
                                                className="mr-2 text-success focus:ring-success"
                                            />
                                            <span className="text-sm text-ink-3">Approve</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="decision"
                                                value="reject"
                                                checked={approvalDecision === 'reject'}
                                                onChange={(e) => setApprovalDecision(e.target.value as 'approve' | 'reject')}
                                                className="mr-2 text-danger focus:ring-danger"
                                            />
                                            <span className="text-sm text-ink-3">Reject</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Notes {approvalDecision === 'reject' && '(Required for rejection)'}
                                    </label>
                                    <textarea
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                        rows={4}
                                        required={approvalDecision === 'reject'}
                                        className={textareaClass}
                                        placeholder={
                                            approvalType === 'inspection' 
                                                ? "Enter notes about the inspection approval..."
                                                : approvalType === 'handover'
                                                ? "Enter notes about the handover approval..."
                                                : "Enter notes about the project closure..."
                                        }
                                    />
                                </div>

                                {approvalType === 'closeout' && (
                                    <div className="bg-info-soft rounded-lg p-3">
                                        <div className="flex items-start space-x-2">
                                            <ExternalLink className="w-4 h-4 text-info mt-0.5" />
                                            <div className="text-sm text-info">
                                                <p className="font-medium mb-1">This action will:</p>
                                                <ul className="list-disc list-inside space-y-1 text-xs">
                                                    <li>Officially close the project</li>
                                                    <li>Mark all closure activities as complete</li>
                                                    <li>Archive project data</li>
                                                    <li>Generate closure report</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
</form>
                    </Modal>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default ProjectClosurePage;
