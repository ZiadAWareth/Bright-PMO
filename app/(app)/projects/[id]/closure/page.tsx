"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    ArrowLeft,
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
                        <h1 className="text-2xl font-semibold text-ink mb-4">
                            Project Not Found
                        </h1>
                        <button
                            onClick={() => router.push("/projects")}
                            className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
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
            <DashboardLayout>
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-ink">
                                    Project Closure Management
                                </h1>
                                <p className="text-muted">
                                    {project.name} • {project.project_code}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                project.status === 'completed' 
                                    ? 'bg-success-soft text-success  '
                                    : 'bg-surface-2 text-ink-2  '
                            }`}>
                                {project.status === 'completed' ? 'Project Completed' : project.status === 'closed' ? 'Project Closed' : 'In progress' }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Overview Cards - Always Visible */}
                {project.status === 'completed' && project.closure_checklists && project.closure_checklists.length > 0 && (
                    <div className="bg-surface border border-line rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-ink mb-6">
                            Closure Progress Overview
                        </h3>
                        
                        {/* Progress Card - Only Checklist Items */}
                        <div className="bg-success-soft rounded-lg p-6 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-success font-medium">
                                        Checklist Progress
                                    </p>
                                    <p className="text-3xl font-bold text-success">
                                        {project.closure_checklists?.filter(item => item.status === 'complete').length || 0}
                                        <span className="text-lg text-success font-normal">
                                            /{project.closure_checklists?.length || 0}
                                        </span>
                                    </p>
                                    <p className="text-xs text-success">
                                        Completed / Total Items
                                    </p>
                                </div>
                                <CheckCircle className="w-12 h-12 text-success" />
                            </div>
                        </div>

                        {/* Overall Progress */}
                        <div className="bg-surface-2 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-ink">
                                    Overall Closure Progress
                                </h4>
                                <span className="text-2xl font-bold text-success">
                                    {Math.round(
                                        (project.closure_checklists?.filter(item => item.status === 'complete').length || 0) /
                                        (project.closure_checklists?.length || 1) * 100
                                    ) || 0}%
                                </span>
                            </div>
                            <div className="w-full bg-surface-3 rounded-full h-4">
                                <div
                                    className="bg-gradient-to-r from-success to-success h-4 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.round(
                                            (project.closure_checklists?.filter(item => item.status === 'complete').length || 0) /
                                            (project.closure_checklists?.length || 1) * 100
                                        ) || 0}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="bg-surface border border-line rounded-xl mb-6">
                    <div className="flex items-center space-x-1 p-1 overflow-x-auto whitespace-nowrap">
                        {[
                            { id: "checklist", label: "Overview", icon: <CheckCircle size={16} />, type: null, order: 0 },
                            { id: "inspection", label: "Inspection", icon: <Eye size={16} />, type: 'inspection', order: 1 },
                            { id: "punch-create", label: "Create Punch Items", icon: <Plus size={16} />, type: 'create_punch_list', order: 2 },
                            { id: "punch-resolve", label: "Resolve Punch Items", icon: <AlertTriangle size={16} />, type: 'punch_list', order: 3 },
                            { id: "documents", label: "Documents", icon: <FileText size={16} />, type: 'documents', order: 4 },
                            { id: "handover", label: "Handover", icon: <User size={16} />, type: 'handover', order: 5 },
                            { id: "approvals", label: "Approvals", icon: <CheckCircle size={16} />, type: 'approval', order: 6 },
                            { id: "reports", label: "Reports", icon: <Download size={16} />, type: 'manual', order: 7 },
                        ].filter((tab) => {
                            // Always show the overview tab
                            if (tab.id === 'checklist') return true;
                            
                            // For other tabs, only show the current pending step
                            if (tab.type && project?.closure_checklists) {
                                const checklistItem = project.closure_checklists.find(item => item.type === tab.type);
                                if (checklistItem && checklistItem.status === 'pending') {
                                    // Check if this is the next step in order (all previous steps are completed)
                                    const stepOrder = [
                                        'inspection', 'create_punch_list', 'punch_list', 
                                        'documents', 'handover', 'approval', 'manual'
                                    ];
                                    
                                    const currentStepIndex = stepOrder.indexOf(tab.type);
                                    let canAccess = true;
                                    
                                    // Check if all previous steps are completed
                                    for (let i = 0; i < currentStepIndex; i++) {
                                        const prevStepItem = project.closure_checklists.find(
                                            item => item.type === stepOrder[i]
                                        );
                                        if (!prevStepItem || prevStepItem.status !== 'complete') {
                                            canAccess = false;
                                            break;
                                        }
                                    }
                                    
                                    return canAccess;
                                }
                            }
                            
                            return false;
                        }).map((tab) => {
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSection(tab.id)}
                                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative ${
                                        activeSection === tab.id
                                            ? "bg-bright text-white"
                                            : "text-bright hover:text-bright-deep  hover:bg-bright-soft "
                                    }`}
                                >
                                    {/* Current step indicator */}
                                    {tab.id !== 'checklist' && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-bright rounded-full animate-pulse"></div>
                                    )}
                                    
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

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
                                            className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors mx-auto"
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
                                <div className="bg-success-soft rounded-lg p-6 mb-6">
                                    <h4 className="font-semibold text-success mb-4">
                                        Closure Summary
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        {project.closure_approved_at && (
                                            <div>
                                                <span className="text-success font-medium">Closed Date: </span>
                                                <span className="text-success">
                                                    {new Date(project.closure_approved_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        {project.closure_approved_user && (
                                            <div>
                                                <span className="text-success font-medium">Closed By: </span>
                                                <span className="text-success">
                                                    {project.closure_approved_user.account?.first_name} {project.closure_approved_user.account?.last_name}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-success font-medium">Total Checklist Items: </span>
                                            <span className="text-success">
                                                {project.closure_checklists?.length || 0} (All Completed)
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-success font-medium">Project Duration: </span>
                                            <span className="text-success">
                                                {Math.ceil((new Date(project.actual_end_date || new Date()).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {project.closure_notes && (
                                        <div className="mt-4 pt-4 border-t border-success">
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
                                        className="flex items-center space-x-2 px-6 py-3 bg-muted text-white rounded-lg hover:bg-ink-solid-3 transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                        <span>Back to Projects</span>
                                    </button>
                                    <button
                                        onClick={handleDownloadPDFReport}
                                        disabled={isGeneratingPDF}
                                        className="flex items-center space-x-2 px-6 py-3 bg-success text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="bg-surface border border-line rounded-xl p-8">
                            <div className="text-center">
                                <Clock className="w-16 h-16 text-faint mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-ink mb-2">
                                    Project Still in Execution Phase
                                </h3>
                                <p className="text-muted mb-6">
                                    The closure process can only be initiated once the project status is set to "Completed".
                                </p>
                                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    project.status === 'execution' 
                                        ? 'bg-info-soft text-info  '
                                        : project.status === 'planning'
                                        ? 'bg-warning-soft text-warning  '
                                        : 'bg-surface-2 text-ink-2  '
                                }`}>
                                    Current Status: {project.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ) : !project.closure_checklists || project.closure_checklists.length === 0 ? (
                        <div className="bg-surface border border-line rounded-xl p-8">
                            <div className="text-center">
                                <CheckCircle className="w-16 h-16 text-faint mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-ink mb-2">
                                    Project Closure Not Started
                                </h3>
                                <p className="text-muted mb-6">
                                    Start the closure process to manage completion documents, checklists, and punch list items.
                                </p>
                                <button
                                    onClick={startClosureProcess}
                                    disabled={isStartingClosure}
                                    className="inline-flex items-center space-x-2 px-6 py-3 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isStartingClosure ? (
                                        <Spinner size={20} />
                                    ) : (
                                        <CheckCircle size={20} />
                                    )}
                                    <span>{isStartingClosure ? "Starting..." : "Start Closure Process"}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>

                            {/* Documents Section */}
                            {activeSection === "documents" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-ink">
                                            Closure Documents
                                        </h3>
                                        
                                        {/* Bulk Upload Button */}
                                        <label className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${bulkUploading ? 'bg-bright cursor-not-allowed opacity-90' : 'bg-bright hover:bg-bright-deep cursor-pointer'}`}>
                                            {bulkUploading ? (
                                                <Spinner size={16} />
                                            ) : (
                                                <Upload size={16} />
                                            )}
                                            <span>{bulkUploading ? "Uploading..." : "Bulk Upload Documents"}</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                onChange={handleBulkDocumentUpload}
                                                className="hidden"
                                                disabled={bulkUploading}
                                            />
                                        </label>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {project.closure_documents?.map((docItem) => (
                                            <div
                                                key={docItem.id}
                                                className="border border-line rounded-lg p-4"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <FileText className="w-8 h-8 text-info" />
                                                        <div>
                                                            <h4 className="font-medium text-ink">
                                                                {docItem.document?.name || `${docItem.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Document`}
                                                            </h4>
                                                            <p className="text-sm text-muted">
                                                                Type: {docItem.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                                                {docItem.required && ' (Required)'}
                                                            </p>
                                                            {docItem.notes && (
                                                                <p className="text-xs text-muted mt-1">
                                                                    {docItem.notes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                            !docItem.document
                                                                ? 'bg-danger-soft text-danger  '
                                                                : docItem.approved
                                                                ? 'bg-success-soft text-success  '
                                                                : docItem.submitted
                                                                ? 'bg-warning-soft text-warning  '
                                                                : 'bg-surface-2 text-ink-2  '
                                                        }`}>
                                                            {!docItem.document ? 'Not Uploaded' :
                                                             docItem.approved ? 'Approved' : 
                                                             docItem.submitted ? 'Under Review' : 'Draft'}
                                                        </span>
                                                        {!docItem.document ? (
                                                            <label className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${uploadingDocumentItemId === docItem.id ? 'bg-bright cursor-not-allowed opacity-90' : 'bg-bright hover:bg-bright-deep cursor-pointer'}`}>
                                                                {uploadingDocumentItemId === docItem.id ? (
                                                                    <Spinner size={16} />
                                                                ) : (
                                                                    <Upload size={16} />
                                                                )}
                                                                <span>{uploadingDocumentItemId === docItem.id ? "Uploading..." : "Upload"}</span>
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                                    onChange={(e) => handleFileUpload(docItem.id, e.target.files)}
                                                                    className="hidden"
                                                                    disabled={uploadingDocumentItemId !== null}
                                                                />
                                                            </label>
                                                        ) : (
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => docItem.document?.document_id && window.open(`/api/documents/download?documentId=${docItem.document.document_id}`, "_blank")}
                                                                    className="p-2 text-info hover:bg-info-soft rounded-lg transition-colors"
                                                                    title="View document"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
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
                                                                    className="p-2 text-success hover:bg-success-soft rounded-lg transition-colors"
                                                                    title="Download document"
                                                                >
                                                                    <Download size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* No documents message */}
                                        {(!project.closure_documents || project.closure_documents.length === 0) && (
                                            <div className="text-center py-8">
                                                <FileText className="w-16 h-16 text-faint mx-auto mb-4" />
                                                <h4 className="text-lg font-medium text-ink mb-2">
                                                    No Closure Documents Found
                                                </h4>
                                                <p className="text-muted mb-4">
                                                    Use the bulk upload button above to upload multiple closure documents at once.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Checklist Section */}
                            {activeSection === "checklist" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-ink mb-6">
                                        Closure Checklist
                                    </h3>
                                    
                                    {/* Current Step Guidance */}
                                    {(() => {
                                        const nextStep = getNextRequiredStep();
                                        return nextStep ? (
                                            <div className="bg-bright-soft rounded-lg p-4 mb-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-bright-soft rounded-full flex items-center justify-center">
                                                        <AlertTriangle className="w-4 h-4 text-bright" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-bright">
                                                            Current Step: {nextStep.label}
                                                        </h4>
                                                        <p className="text-sm text-bright-deep">
                                                            Complete this step to proceed with the closure process.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-success-soft rounded-lg p-4 mb-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-success-soft rounded-full flex items-center justify-center">
                                                        <CheckCircle className="w-4 h-4 text-success" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-success">
                                                            All Steps Completed!
                                                        </h4>
                                                        <p className="text-sm text-success">
                                                            The project closure process is ready for finalization.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    
                                    <div className="space-y-3">
                                        {project.closure_checklists?.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-4 border border-line rounded-lg hover:bg-surface-2 transition-colors"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <button
                                                        onClick={() => handleChecklistToggle(item.id)}
                                                        disabled={item.auto_checked}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                                            item.status === 'complete' 
                                                                ? 'bg-success text-white' 
                                                                : 'bg-surface-3 hover:bg-surface-3 '
                                                        } ${item.auto_checked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                    >
                                                        {item.status === 'complete' && <CheckCircle size={16} />}
                                                    </button>
                                                    <div>
                                                        <h4 className="font-medium text-ink">
                                                            {item.title}
                                                        </h4>
                                                        <p className="text-sm text-muted">
                                                            Type: {item.type} {item.auto_checked && '(Auto-checked)'}
                                                        </p>
                                                        {item.completed_at && (
                                                            <p className="text-xs text-muted mt-1">
                                                                Completed on {new Date(item.completed_at).toLocaleDateString()}
                                                                {item.completedBy && ` by ${item.completedBy.account.first_name} ${item.completedBy.account.last_name}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {item.type === 'inspection' && item.status === 'pending' && !project.final_inspection && (
                                                        <button
                                                            onClick={() => setShowScheduleInspectionModal(true)}
                                                            className="flex items-center space-x-2 px-3 py-1 bg-bright text-white text-sm rounded hover:bg-bright-deep transition-colors"
                                                        >
                                                            <Calendar size={14} />
                                                            <span>Schedule</span>
                                                        </button>
                                                    )}
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        item.status === 'complete'
                                                            ? 'bg-success-soft text-success  '
                                                            : 'bg-warning-soft text-warning  '
                                                    }`}>
                                                        {item.status === 'complete' ? 'Complete' : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create Punch Items Section */}
                            {activeSection === "punch-create" && (
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-ink">
                                            Create Punch List Items
                                        </h3>
                                        <button
                                            onClick={() => setShowAddPunchItemModal(true)}
                                            className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
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
                                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-danger-soft text-danger">
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
                                                        >
                                                            <Trash2 size={16} />
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
                                                    className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors mx-auto"
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
                                                    className="flex items-center space-x-2 px-6 py-3 bg-success text-white rounded-lg hover:opacity-90 transition-colors"
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
                                            <span className="text-success">
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
                                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                            item.status === 'resolved'
                                                                ? 'bg-success-soft text-success  '
                                                                : 'bg-info-soft text-info  '
                                                        }`}>
                                                            {item.status === 'resolved' ? 'Resolved' : 'In Progress'}
                                                        </span>
                                                        {item.status !== 'resolved' && (
                                                            <Dropdown
                                                              value={String(item.status ?? '')}
                                                              onChange={(__v: string) => handleUpdatePunchItem(item.id, __v)}
                                                              options={[
                                                              { value: String("in_progress"), label: "In Progress" },
                                                              { value: String("resolved"), label: "Mark as Resolved" },
                                                            ]}
                                                            />
                                                        )}
                                                        {item.status === 'resolved' && (
                                                            <button
                                                                onClick={() => handleDeletePunchItem(item.id)}
                                                                className="p-1 text-danger hover:bg-danger-soft rounded transition-colors"
                                                                title="Delete resolved item"
                                                            >
                                                                <Trash2 size={16} />
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
                                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-bright-soft text-bright">
                                                            Ready to Start
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdatePunchItem(item.id, 'in_progress')}
                                                            className="px-3 py-1 text-sm bg-info text-white rounded hover:opacity-90 transition-colors"
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
                                                className="flex items-center space-x-2 px-6 py-3 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors mx-auto"
                                            >
                                                <Calendar size={16} />
                                                <span>Schedule Inspection</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Inspection Details */}
                                            <div className="bg-info-soft rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-semibold text-info">
                                                        Inspection Details
                                                    </h4>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        project.final_inspection.status === 'completed'
                                                            ? 'bg-success-soft text-success  '
                                                            : project.final_inspection.status === 'in_progress'
                                                            ? 'bg-info-soft text-info  '
                                                            : 'bg-warning-soft text-warning  '
                                                    }`}>
                                                        {project.final_inspection.status === 'completed' ? 'Completed' : 
                                                         project.final_inspection.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-info font-medium">Scheduled Date</p>
                                                        <p className="text-info">
                                                            {new Date(project.final_inspection.scheduled_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-info font-medium">Scheduled Time</p>
                                                        <p className="text-info">
                                                            {project.final_inspection.scheduled_time}
                                                        </p>
                                                    </div>
                                                    {project.final_inspection.inspector && (
                                                        <div>
                                                            <p className="text-sm text-info font-medium">Inspector</p>
                                                            <p className="text-info">
                                                                {project.final_inspection.inspector.account?.first_name} {project.final_inspection.inspector.account?.last_name}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {project.final_inspection.submitted_at && (
                                                        <div>
                                                            <p className="text-sm text-info font-medium">Submitted</p>
                                                            <p className="text-info">
                                                                {new Date(project.final_inspection.submitted_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

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
                                                                <button className="ml-auto p-1 text-info hover:bg-info-soft rounded">
                                                                    <Download size={14} />
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
                                                        className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
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
                                                className="flex items-center space-x-2 px-6 py-3 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors mx-auto"
                                            >
                                                <Calendar size={16} />
                                                <span>Schedule Handover</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Handover Details */}
                                            <div className="bg-accent-violet-soft rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-semibold text-accent-violet">
                                                        Handover Details
                                                    </h4>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        project.handover.status === 'completed'
                                                            ? 'bg-success-soft text-success  '
                                                            : 'bg-warning-soft text-warning  '
                                                    }`}>
                                                        {project.handover.status === 'completed' ? 'Completed' : 'Scheduled'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-accent-violet font-medium">Handover Date</p>
                                                        <p className="text-accent-violet">
                                                            {new Date(project.handover.handover_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-accent-violet font-medium">Handover Time</p>
                                                        <p className="text-accent-violet">
                                                            {project.handover.handover_time}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-accent-violet font-medium">Handed Over By</p>
                                                        <p className="text-accent-violet">
                                                            {project.handover.handover_user?.account?.first_name} {project.handover.handover_user?.account?.last_name}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-accent-violet font-medium">Handed Over To</p>
                                                        <p className="text-accent-violet">
                                                            {project.handover.handed_over_to}
                                                        </p>
                                                    </div>
                                                    {project.handover.submitted_at && (
                                                        <div>
                                                            <p className="text-sm text-accent-violet font-medium">Completed At</p>
                                                            <p className="text-accent-violet">
                                                                {new Date(project.handover.submitted_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

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
                                                        <button className="ml-auto p-1 text-accent-violet hover:bg-accent-violet-soft rounded">
                                                            <Download size={14} />
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
                                                            className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
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
                                                            className="flex items-center space-x-2 px-4 py-2 bg-accent-violet text-white rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                                        >
                                                            <Upload size={16} />
                                                            <span>Upload Receipt</span>
                                                        </label>
                                                        {handoverReceiptFile && (
                                                            <button
                                                                onClick={handleUploadHandoverReceipt}
                                                                className="flex items-center space-x-2 px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 transition-colors"
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
                                                    <p className="text-sm text-info mb-1">Selected file:</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-info">{handoverReceiptFile.name}</span>
                                                        <span className="text-xs text-info">
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
                                        <div className="bg-info-soft rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <Eye className="w-6 h-6 text-info" />
                                                    <div>
                                                        <h4 className="font-semibold text-info">
                                                            Final Inspection Approval
                                                        </h4>
                                                        <p className="text-sm text-info">
                                                            Review and approve the final inspection results
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {project.final_inspection ? (
                                                        <>
                                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                                                                    className="flex items-center space-x-2 px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    <span>Review & Approve</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-surface-2 text-ink-2">
                                                            No Inspection Scheduled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {project.final_inspection?.approved && project.final_inspection.approver && (
                                                <div className="mt-4 pt-4 border-t border-info">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>
                                                            <span className="text-info">Approved by: </span>
                                                            <span className="text-info">
                                                                {project.final_inspection.approver.account?.first_name} {project.final_inspection.approver.account?.last_name}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-info">Approved on: </span>
                                                            <span className="text-info">
                                                                {new Date(project.final_inspection.approved_at!).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {project.final_inspection.approval_notes && (
                                                        <div className="mt-2">
                                                            <span className="text-info text-sm">Notes: </span>
                                                            <span className="text-info text-sm">
                                                                {project.final_inspection.approval_notes}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Handover Approval */}
                                        <div className="bg-accent-violet-soft rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <User className="w-6 h-6 text-accent-violet" />
                                                    <div>
                                                        <h4 className="font-semibold text-accent-violet">
                                                            Handover Approval
                                                        </h4>
                                                        <p className="text-sm text-accent-violet">
                                                            Review and approve the project handover
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {project.handover ? (
                                                        <>
                                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                                                                    className="flex items-center space-x-2 px-4 py-2 bg-accent-violet text-white rounded-lg hover:opacity-90 transition-colors"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    <span>Review & Approve</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-surface-2 text-ink-2">
                                                            No Handover Scheduled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {project.handover?.approved_at && project.handover.approver && (
                                                <div className="mt-4 pt-4 border-t border-accent-violet">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>
                                                            <span className="text-accent-violet">Approved by: </span>
                                                            <span className="text-accent-violet">
                                                                {project.handover.approver.account?.first_name} {project.handover.approver.account?.last_name}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-accent-violet">Approved on: </span>
                                                            <span className="text-accent-violet">
                                                                {new Date(project.handover.approved_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Project Closure Approval */}
                                        <div className="bg-success-soft rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-6 h-6 text-success" />
                                                    <div>
                                                        <h4 className="font-semibold text-success">
                                                            Project Closure Approval
                                                        </h4>
                                                        <p className="text-sm text-success">
                                                            Final approval to officially close the project
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {/* Check if all prerequisites are met */}
                                                    {project.final_inspection?.approved && project.handover?.approved_at ? (
                                                        <>
                                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                                project.closure_approved_at
                                                                    ? 'bg-success-soft text-success  '
                                                                    : 'bg-warning-soft text-warning  '
                                                            }`}>
                                                                {project.closure_approved_at ? 'Project Closed' : 'Ready for Closure'}
                                                            </span>
                                                            {!project.closure_approved_at && (
                                                                <button
                                                                    onClick={() => openApprovalModal('closeout')}
                                                                    className="flex items-center space-x-2 px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 transition-colors"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                    <span>Close Project</span>
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="text-center">
                                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-surface-2 text-ink-2">
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
                                                <div className="mt-4 pt-4 border-t border-success">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div>                                            <span className="text-success">Closed by: </span>
                                            <span className="text-success">
                                                {project.closure_approved_user?.account?.first_name} {project.closure_approved_user?.account?.last_name}
                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-success">Closed on: </span>
                                                            <span className="text-success">
                                                                {new Date(project.closure_approved_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {project.closure_notes && (
                                                        <div className="mt-2">
                                                            <span className="text-success text-sm">Notes: </span>
                                                            <span className="text-success text-sm">
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
                                        <div className="bg-info-soft rounded-lg p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <FileText className="w-6 h-6 text-info" />
                                                    <div>
                                                        <h4 className="font-semibold text-info">
                                                            Comprehensive Closure Report
                                                        </h4>
                                                        <p className="text-sm text-info">
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
                                                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-soft text-success">
                                                                Downloaded
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                    <button
                                                        onClick={handleDownloadPDFReport}
                                                        disabled={isGeneratingPDF}
                                                        className="flex items-center space-x-2 px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            
                                            <div className="bg-info-soft rounded-lg p-4">
                                                <h5 className="font-medium text-info mb-2">
                                                    Report Contents:
                                                </h5>
                                                <ul className="text-sm text-info space-y-1">
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
                                                    <div className="mt-4 pt-4 border-t border-info">
                                                        <div className="flex items-center space-x-2 text-sm text-info">
                                                            <CheckCircle size={16} />
                                                            <span>Report downloaded on {new Date(reportChecklistItem.completed_at).toLocaleDateString()}</span>
                                                            {reportChecklistItem.completedBy && (
                                                                <span>by {reportChecklistItem.completedBy.account.first_name} {reportChecklistItem.completedBy.account.last_name}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 pt-4 border-t border-info">
                                                        <div className="flex items-center space-x-2 text-sm text-info">
                                                            <Clock size={16} />
                                                            <span>Click "Download PDF" to generate and download the report. This will mark the checklist item as complete.</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {project.closure_approved_at && (
                                                <div className="mt-4 pt-4 border-t border-info">
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
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowAddPunchItemModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    Add Punch List Item
                                </h3>
                                <button
                                    onClick={() => setShowAddPunchItemModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddPunchItemModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Punch Item Modal */}
                {showEditPunchItemModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowEditPunchItemModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    Edit Punch List Item
                                </h3>
                                <button
                                    onClick={() => setShowEditPunchItemModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditPunchItemModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                                    >
                                        Update Item
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Schedule Inspection Modal */}
                {showScheduleInspectionModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowScheduleInspectionModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    Schedule Final Inspection
                                </h3>
                                <button
                                    onClick={() => setShowScheduleInspectionModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleInspectionModal(false)}
                                        disabled={scheduleInspectionSubmitting}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={scheduleInspectionSubmitting}
                                        className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 min-w-[160px]"
                                    >
                                        {scheduleInspectionSubmitting ? (
                                            <>
                                                <Spinner size={16} />
                                                Scheduling...
                                            </>
                                        ) : (
                                            "Schedule Inspection"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Inspection Details Modal */}
                {showInspectionDetailsModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowInspectionDetailsModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    Complete Inspection
                                </h3>
                                <button
                                    onClick={() => setShowInspectionDetailsModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowInspectionDetailsModal(false)}
                                        disabled={inspectionSubmitting}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inspectionSubmitting}
                                        className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 min-w-[180px]"
                                    >
                                        {inspectionSubmitting ? (
                                            <>
                                                <Spinner size={16} />
                                                Submitting...
                                            </>
                                        ) : (
                                            "Complete Inspection"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Schedule Handover Modal */}
                {showScheduleHandoverModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowScheduleHandoverModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    Schedule Project Handover
                                </h3>
                                <button
                                    onClick={() => setShowScheduleHandoverModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Handed Over To *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={handoverForm.handed_over_to}
                                        onChange={(e) => setHandoverForm(prev => ({ ...prev, handed_over_to: e.target.value }))}
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
                                        placeholder="Enter name of person receiving the project"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Initial Notes (Optional)
                                    </label>
                                    <textarea
                                        value={handoverForm.notes}
                                        onChange={(e) => setHandoverForm(prev => ({ ...prev, notes: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
                                        placeholder="Enter any initial notes for the handover..."
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleHandoverModal(false)}
                                        disabled={scheduleHandoverSubmitting}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={scheduleHandoverSubmitting}
                                        className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 min-w-[180px]"
                                    >
                                        {scheduleHandoverSubmitting ? (
                                            <>
                                                <Spinner size={16} />
                                                Scheduling...
                                            </>
                                        ) : (
                                            "Schedule Handover"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Handover Details Modal */}
                {showHandoverDetailsModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowHandoverDetailsModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    Complete Handover
                                </h3>
                                <button
                                    onClick={() => setShowHandoverDetailsModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowHandoverDetailsModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 transition-colors"
                                    >
                                        Complete Handover
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Approval Modal */}
                {showApprovalModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowApprovalModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-ink">
                                    {approvalType === 'inspection' && 'Approve Inspection'}
                                    {approvalType === 'handover' && 'Approve Handover'}
                                    {approvalType === 'closeout' && 'Close Project'}
                                </h3>
                                <button
                                    onClick={() => setShowApprovalModal(false)}
                                    className="p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
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
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-bright focus:border-transparent"
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

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => setShowApprovalModal(false)}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`px-4 py-2 text-white rounded-lg transition-colors ${
                                            approvalDecision === 'approve'
                                                ? 'bg-success hover:opacity-90'
                                                : 'bg-danger hover:opacity-90'
                                        }`}
                                    >
                                        {approvalDecision === 'approve' ? 'Approve' : 'Reject'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default ProjectClosurePage;
