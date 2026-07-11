"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Eye,
  UserPlus,
  Upload,
  FileText,
  BarChart3,
  Shield,
  TrendingUp,
  Archive,
  Settings,
  Target,
  X,
  FileSpreadsheet,
} from "lucide-react";
import axios from "axios";
import { Project } from "@prisma/client";
import { ProjectWithRelations } from "@/types/project";
import { set } from "date-fns";
import { ProjectStatus, ProjectPriority } from "@prisma/client";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MassUpdateModal from "@/components/MassUpdateModal";
import ArchivedProjectsModal from "@/components/ArchivedProjectsModal";
import EditProjectModal from "@/components/EditProjectModal";
import ProjectTemplateManager from "@/components/ProjectTemplateManager";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Portfolio {
  portfolio_id: number;
  name: string;
  description: string | null;
}

interface ProjectTask {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  priority: "high" | "medium" | "low";
}

interface FilterState {
  search: string;
  portfolio: string;
  status: string;
  manager: string;
  department: string;
  dateRange: string;
  priority: string;
  compliance: string;
  strategicValue: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isDeleting: boolean;
}

const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  projectName,
  isDeleting,
}: DeleteModalProps) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete Project
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {projectName}
          </span>
          ? This action cannot be undone and all associated data will be
          permanently removed.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Project"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectsPage = () => {
  const router = useRouter();
  const [activeView, setActiveView] = useState("ADMIN");
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<
    ProjectWithRelations[]
  >([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    portfolio: "",
    status: "",
    manager: "",
    department: "",
    dateRange: "",
    priority: "",
    compliance: "",
    strategicValue: "",
  });
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "kanban">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectWithRelations | null>(null);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [projectToEdit, setProjectToEdit] =
    useState<ProjectWithRelations | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Projects fetched successfully:", response.data);
      setProjects(response.data as ProjectWithRelations[]);
      setFilteredProjects(
        getRoleFilteredProjects(
          response.data as ProjectWithRelations[],
          activeView
        )
      );
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();

    axios
      .get(`api/auth/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log("authenticated fetched:", res.data);
        axios
          .get(`api/users/${res.data.user.user_id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
          .then((userRes) => {
            console.log("User fetched:", userRes.data);
            setUserName(
              `${userRes.data.user.account.first_name} ${userRes.data.user.account.last_name}`
            );
            // setActiveView(userRes.data.role.name);
          })
          .catch((error) => {
            console.error("Error fetching user details:", error);
          });
      })
      .catch((error) => {
        console.error("Error fetching user role:", error);
      });

    axios
      .get("api/portfolios", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log("Portfolios fetched successfully:", res.data);
        setPortfolios(res.data);
      })
      .catch((error) => {
        console.error("Error fetching portfolios:", error);
      });
  }, [activeView]);

  useEffect(() => {
    const filtered = applyFilters(
      getRoleFilteredProjects(projects, activeView),
      filters
    );
    setFilteredProjects(filtered);
  }, [filters, projects, activeView]);

  const getRoleFilteredProjects = (
    allProjects: ProjectWithRelations[],
    role: string
  ): ProjectWithRelations[] => {
    switch (role) {
      case "admin":
        return allProjects; // Admin sees all projects

      case "project-manager":
        // Show projects they manage + projects they're involved in
        return allProjects.filter(
          (project) =>
            `${project.creator.account.first_name} ${project.creator.account.last_name}` ===
              userName || // Projects they manage
            project.tasks?.some((task) =>
              task.assigned_users?.some(
                (assignment) =>
                  `${assignment.user.account?.first_name} ${assignment.user.account?.last_name}` ===
                  userName
              )
            ) // Projects they're involved in
        );

      case "technical":
        // Show only projects where user has assigned tasks
        return allProjects.filter(
          (project) =>
            project.tasks?.some((task) =>
              task.assigned_users?.some(
                (assignment) =>
                  `${assignment.user.account?.first_name} ${assignment.user.account?.last_name}` ===
                  userName
              )
            ) ||
            project.team_members.some(
              (member) =>
                `${member.user.account.first_name} ${member.user.account.last_name}` ===
                userName
            )
        );

      case "PMO":
        // PMO sees all projects but with focus on governance
        return allProjects;

      case "executive":
        // Executive sees strategic projects only
        return allProjects.filter(
          (project) =>
            project.strategicValue === "high" ||
            project.budget_amount > 20000000
        );

      default:
        return allProjects;
    }
  };

  const applyFilters = (
    projectList: ProjectWithRelations[],
    currentFilters: FilterState
  ): ProjectWithRelations[] => {
    return projectList.filter((project) => {
      const matchesSearch =
        !currentFilters.search ||
        project.name
          .toLowerCase()
          .includes(currentFilters.search.toLowerCase()) ||
        project.description
          ?.toLowerCase()
          .includes(currentFilters.search.toLowerCase()) ||
        (
          project.creator.account.first_name +
          " " +
          project.creator.account.last_name
        )
          .toLowerCase()
          .includes(currentFilters.search.toLowerCase());

      const matchesPortfolio =
        !currentFilters.portfolio ||
        project.portfolio.name === currentFilters.portfolio;
      const matchesStatus =
        !currentFilters.status || project.status === currentFilters.status;
      const matchesManager =
        !currentFilters.manager ||
        project.manager?.user_id?.toString() === currentFilters.manager;
      const matchesDepartment =
        !currentFilters.department ||
        project.department === currentFilters.department;
      const matchesPriority =
        !currentFilters.priority ||
        project.priority === currentFilters.priority;
      const matchesCompliance =
        !currentFilters.compliance ||
        project.compliance === currentFilters.compliance;
      const matchesStrategicValue =
        !currentFilters.strategicValue ||
        project.strategicValue === currentFilters.strategicValue;

      return (
        matchesSearch &&
        matchesPortfolio &&
        matchesStatus &&
        matchesManager &&
        matchesDepartment &&
        matchesPriority &&
        matchesCompliance &&
        matchesStrategicValue
      );
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (status) {
      case "planning":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case "execution":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case "completed":
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
      case "on_hold":
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
      case "at_risk":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case "delayed":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case "pending_approval":
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300`;
      case "closed":
        return `${baseClasses} bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400`;
      default:
        return baseClasses;
    }
  };

  const getPriorityBadge = (priority: string) => {
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

  const getComplianceBadge = (compliance: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
    switch (compliance) {
      case "compliant":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case "non_compliant":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      default:
        return baseClasses;
    }
  };

  const getRoleSpecificActions = (role: string) => {
    // Only PJM, PMO, and ADMIN can perform actions
    if (!["PJM", "PMO", "ADMIN"].includes(role)) {
      return [];
    }

    switch (role) {
      case "ADMIN":
        return [
          {
            label: "New Project",
            icon: <Plus size={16} />,
            action: "create",
            variant: "primary",
          },
          {
            label: "Excel Templates",
            icon: <FileSpreadsheet size={16} />,
            action: "templates",
            variant: "secondary",
          },
          {
            label: "Bulk Export",
            icon: <Download size={16} />,
            action: "export",
            variant: "secondary",
          },
          {
            label: "Archive Selected",
            icon: <Archive size={16} />,
            action: "archive",
            variant: "secondary",
          },
          {
            label: "Mass Update",
            icon: <Edit size={16} />,
            action: "mass_update",
            variant: "secondary",
          },
        ];
      case "PJM":
        return [
          {
            label: "New Project",
            icon: <Plus size={16} />,
            action: "create",
            variant: "primary",
          },
          {
            label: "Excel Templates",
            icon: <FileSpreadsheet size={16} />,
            action: "templates",
            variant: "secondary",
          },
          {
            label: "Add Team Member",
            icon: <UserPlus size={16} />,
            action: "add_member",
            variant: "secondary",
          },
          {
            label: "Export My Projects",
            icon: <Download size={16} />,
            action: "export",
            variant: "secondary",
          },
        ];
      case "PMO":
        return [
          {
            label: "Audit Projects",
            icon: <Shield size={16} />,
            action: "audit",
            variant: "primary",
          },
          {
            label: "Excel Templates",
            icon: <FileSpreadsheet size={16} />,
            action: "templates",
            variant: "secondary",
          },
          {
            label: "Compliance Report",
            icon: <FileText size={16} />,
            action: "compliance_report",
            variant: "secondary",
          },
          {
            label: "Portfolio Export",
            icon: <Download size={16} />,
            action: "export",
            variant: "secondary",
          },
        ];
      default:
        return [];
    }
  };

  const getRoleSpecificFilters = (role: string) => {
    const baseFilters = ["search", "status"];

    switch (role) {
      case "admin":
        return [
          ...baseFilters,
          "portfolio",
          "manager",
          "department",
          "priority",
          "compliance",
          "strategicValue",
        ];
      case "project-manager":
        return [...baseFilters, "priority", "dateRange"];
      case "technical":
        return [...baseFilters, "priority"];
      case "pmo":
        return [...baseFilters, "portfolio", "compliance", "strategicValue"];
      case "executive":
        return [...baseFilters, "strategicValue", "portfolio"];
      default:
        return baseFilters;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "OMR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const handleDeleteClick = (project: ProjectWithRelations) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    setDeleteProjectId(projectToDelete.project_id);

    try {
      const response = await axios.delete(
        `api/projects/${projectToDelete.project_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status === 200) {
        setProjects((prevProjects) =>
          prevProjects.filter(
            (p) => p.project_id !== projectToDelete.project_id
          )
        );
        setFilteredProjects((prevProjects) =>
          prevProjects.filter(
            (p) => p.project_id !== projectToDelete.project_id
          )
        );
        setShowDeleteModal(false);
        toast.success("Project deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteProjectId(null);
      setProjectToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  const handleEditClick = (project: ProjectWithRelations) => {
    setProjectToEdit(project);
    setShowEditModal(true);
  };

  const handleEditSuccess = async () => {
    try {
      // Refresh projects list after successful edit
      const response = await axios.get("/api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setProjects(response.data);
      setFilteredProjects(getRoleFilteredProjects(response.data, activeView));
    } catch (error) {
      console.error("Error refreshing projects:", error);
    }
  };

  const handleBulkExport = async () => {
    try {
      const projectIds =
        selectedProjects.length > 0 ? selectedProjects.join(",") : undefined;

      console.log("Starting export with projectIds:", projectIds);

      const response = await axios.get("/api/projects/export", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: projectIds ? { project_ids: projectIds } : {},
      });

      console.log("Export response:", response.data);

      const { projects, export_metadata } = response.data;

      if (!projects || !export_metadata) {
        throw new Error("Invalid response format from export API");
      }

      // Create PDF
      const pdf = new jsPDF("landscape");

      // Title
      pdf.setFontSize(20);
      pdf.text("WUJHA PMO - Projects Export Report", 20, 20);

      // Metadata
      pdf.setFontSize(10);
      pdf.text(
        `Export Date: ${new Date(
          export_metadata.export_date
        ).toLocaleDateString()}`,
        20,
        35
      );
      pdf.text(`Exported by: ${export_metadata.exported_by}`, 20, 42);
      pdf.text(`Total Projects: ${export_metadata.total_projects}`, 20, 49);

      // Summary section
      pdf.setFontSize(12);
      pdf.text("Summary:", 20, 65);
      pdf.setFontSize(10);
      pdf.text(
        `Total Budget: OMR ${export_metadata.summary.total_budget.toLocaleString()}`,
        30,
        75
      );
      pdf.text(
        `Total Actual Cost: OMR ${export_metadata.summary.total_actual_cost.toLocaleString()}`,
        30,
        82
      );
      pdf.text(
        `Average Progress: ${export_metadata.summary.average_progress.toFixed(
          1
        )}%`,
        30,
        89
      );

      // Projects table
      const tableData = projects.map((project: any) => [
        project.project_code,
        project.name,
        project.status.replace("_", " "),
        project.priority,
        `${project.progress_percentage}%`,
        `OMR ${project.budget_amount.toLocaleString()}`,
        `OMR ${project.actual_cost.toLocaleString()}`,
        project.project_manager,
        project.start_date,
        project.planned_end_date,
      ]);

      autoTable(pdf, {
        head: [
          [
            "Code",
            "Project Name",
            "Status",
            "Priority",
            "Progress",
            "Budget",
            "Actual Cost",
            "Manager",
            "Start Date",
            "End Date",
          ],
        ],
        body: tableData,
        startY: 100,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 165, 0] }, // Orange header
        margin: { top: 100 },
      });

      // Save the PDF
      const filename =
        selectedProjects.length > 0
          ? `selected-projects-export-${
              new Date().toISOString().split("T")[0]
            }.pdf`
          : `all-projects-export-${new Date().toISOString().split("T")[0]}.pdf`;

      pdf.save(filename);
      toast.success(`PDF exported successfully: ${filename}`);
    } catch (error: any) {
      console.error("Error exporting projects:", error);

      let errorMessage = "Failed to export projects";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select projects to archive");
      return;
    }

    try {
      const response = await axios.post(
        "/api/projects/archive",
        {
          project_ids: selectedProjects,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(response.data.message);

      // Refresh projects list
      const projectsResponse = await axios.get("/api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setProjects(projectsResponse.data);
      setSelectedProjects([]);
    } catch (error: any) {
      console.error("Error archiving projects:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to archive projects";
      toast.error(errorMessage);
    }
  };

  const handleMassUpdate = () => {
    if (selectedProjects.length === 0) {
      toast.error("Please select projects to update");
      return;
    }
    setShowMassUpdateModal(true);
  };

  const handleMassUpdateSuccess = async () => {
    // Refresh projects list
    try {
      const response = await axios.get("/api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setProjects(response.data);
      setSelectedProjects([]);
    } catch (error) {
      console.error("Error refreshing projects:", error);
    }
  };

  const handleArchivedRestore = async () => {
    // Refresh projects list when projects are restored from archive
    try {
      const response = await axios.get("/api/projects", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setProjects(response.data);
    } catch (error) {
      console.error("Error refreshing projects:", error);
    }
  };

  const renderProjectCard = (project: ProjectWithRelations) => {
    const budgetProgress = (project.actual_cost / project.budget_amount) * 100;

    return (
      <div
        key={project.project_id}
        className={`bg-white dark:bg-slate-800 border rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all group relative ${
          selectedProjects.includes(project.project_id)
            ? "border-orange-500 ring-2 ring-orange-500 ring-opacity-20 bg-orange-50 dark:bg-orange-900/10"
            : "border-gray-200 dark:border-slate-700"
        }`}
      >
        {/* Checkbox - positioned outside clickable area */}
        {["PJM", "PMO", "ADMIN"].includes(activeView) && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedProjects.includes(project.project_id)}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.checked) {
                    setSelectedProjects((prev) => [
                      ...prev,
                      project.project_id,
                    ]);
                  } else {
                    setSelectedProjects((prev) =>
                      prev.filter((id) => id !== project.project_id)
                    );
                  }
                }}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                  selectedProjects.includes(project.project_id)
                    ? "bg-orange-600 border-orange-600"
                    : "bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:border-orange-400"
                }`}
              >
                {selectedProjects.includes(project.project_id) && (
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </label>
          </div>
        )}

        {/* Main content - clickable to navigate */}
        <div
          className="cursor-pointer pr-6 sm:pr-8"
          onClick={() => {
            if (project.status === "planning") {
              router.push(`/projects/${project.project_id}/setup`);
            } else {
              router.push(`/projects/${project.project_id}`);
            }
          }}
        >
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <div className="mb-2 sm:mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 transition-colors mb-1.5 sm:mb-2 line-clamp-2">
                  {project.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className={`${getStatusBadge(project.status)} text-xs`}>
                    {project.status.replace("_", " ")}
                  </span>
                  <span className={`${getPriorityBadge(project.priority)} text-xs`}>
                    {project.priority}
                  </span>
                  {activeView === "PMO" && (
                    <span className={`${getComplianceBadge(project.compliance)} text-xs`}>
                      {project.compliance.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                {project.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <Users size={11} className="sm:w-3 sm:h-3 mr-1" />
                  <span>{project.team_members.length}<span className="hidden xs:inline"> members</span></span>
                </span>
                <span className="flex items-center text-[10px] sm:text-xs">
                  <Calendar size={11} className="sm:w-3 sm:h-3 mr-1" />
                  <span>{formatDate(project.planned_end_date)}</span>
                </span>
                <span className="flex items-center text-[10px] sm:text-xs">
                  <DollarSign size={11} className="sm:w-3 sm:h-3 mr-1" />
                  <span>{formatCurrency(project.budget_amount)}</span>
                </span>
                {activeView === "executive" && (
                  <span className="flex items-center text-[10px] sm:text-xs">
                    <TrendingUp size={11} className="sm:w-3 sm:h-3 mr-1" />
                    <span>{project.roi}%<span className="hidden sm:inline"> ROI</span></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between items-center mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {project.progress_percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 sm:h-2">
              <div
                className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                style={{ width: `${project.progress_percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Budget Progress (Admin/PM/Executive only) */}
          {["ADMIN", "PJM", "PMO"].includes(activeView) && (
            <div className="mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Budget
                </span>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {budgetProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 sm:h-2">
                <div
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    budgetProgress > 90
                      ? "bg-red-500"
                      : budgetProgress > 75
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(budgetProgress, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Tasks Section (Technical/PM only) */}
          {["technical", "project-manager"].includes(activeView) &&
            project.tasks && (
              <div className="mb-3 sm:mb-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  {activeView === "technical" ? "My Tasks" : "Recent Tasks"}
                </h4>
                <div className="space-y-1">
                  {project.tasks?.slice(0, 3).map((task) => (
                    <div
                      key={task.task_id}
                      className="flex items-center justify-between text-[10px] sm:text-xs"
                    >
                      <span className="text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0 mr-2">
                        {task.name}
                      </span>
                      <span className={`${getStatusBadge(task.status)} text-[10px] sm:text-xs flex-shrink-0`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700 gap-2 sm:gap-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Manager:{" "}
                <span className="font-medium">
                  {project.creator.account.first_name +
                    " " +
                    project.creator.account.last_name}
                </span>
              </span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {activeView === "ADMIN" && (
                <>
                  <button
                    className="p-1.5 sm:p-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(project);
                    }}
                    title="Edit project"
                  >
                    <Edit size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    className={`p-1.5 sm:p-1 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ${
                      isDeleting && deleteProjectId === project.project_id
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(project);
                    }}
                    disabled={
                      isDeleting && deleteProjectId === project.project_id
                    }
                    title="Delete project"
                  >
                    <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </>
              )}
              {["PJM", "PMO", "ADMIN"].includes(activeView) && (
                <button
                  className="p-1.5 sm:p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (project.status === "planning") {
                      router.push(`/projects/${project.project_id}/setup`);
                    } else {
                      router.push(`/projects/${project.project_id}`);
                    }
                  }}
                  title="View project"
                >
                  <Eye size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    const availableFilters = getRoleSpecificFilters(activeView);

    return (
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableFilters.includes("search") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      search: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {availableFilters.includes("status") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Statuses</option>
                {Object.values(ProjectStatus).map((status) => (
                  <option key={status} value={status}>
                    {status
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableFilters.includes("portfolio") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Portfolio
              </label>
              <select
                value={filters.portfolio}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    portfolio: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Portfolios</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.portfolio_id} value={portfolio.name}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableFilters.includes("priority") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priority: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Priorities</option>
                {Object.values(ProjectPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardLayout
        title="Projects Directory"
        onViewChange={setActiveView}
        activeView={activeView}
      >
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            {!isLoading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <FolderOpen size={18} className="text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {filteredProjects.length}
                </span>
                <span className="text-sm text-orange-600 dark:text-orange-400">
                  {filteredProjects.length === 1 ? 'project' : 'projects'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 border-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md ${
                showFilters
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 dark:hover:border-blue-500"
              }`}
            >
              <Filter size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline ml-1.5 sm:ml-2">Filters</span>
            </button>

            {["PJM", "PMO", "ADMIN"].includes(activeView) && (
              <button
                onClick={() => setShowArchivedModal(true)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 dark:border-slate-600 rounded-lg font-medium text-xs sm:text-sm text-gray-700 dark:text-gray-300 transition-all duration-200 transform hover:scale-105 hover:shadow-md hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 dark:hover:border-purple-500 hover:text-purple-700 dark:hover:text-purple-300"
              >
                <Archive size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline ml-1.5">View Archived</span>
              </button>
            )}

            {getRoleSpecificActions(activeView).map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  // Handle different actions
                  switch (action.action) {
                    case "create":
                      router.push("/projects/create");
                      break;
                    case "export":
                      handleBulkExport();
                      break;
                    case "archive":
                      handleArchiveSelected();
                      break;
                    case "mass_update":
                      handleMassUpdate();
                      break;
                    case "templates":
                      setShowTemplateManager(true);
                      break;
                    case "add_member":
                      // Handle add member action
                      console.log("Add member action triggered");
                      break;
                    case "upload":
                      // Handle upload action
                      console.log("Upload action triggered");
                      break;
                    case "report_issue":
                      // Handle report issue action
                      console.log("Report issue action triggered");
                      break;
                    case "audit":
                      // Handle audit action
                      console.log("Audit action triggered");
                      break;
                    case "compliance_report":
                      // Handle compliance report action
                      console.log("Compliance report action triggered");
                      break;
                    case "strategic_review":
                      // Handle strategic review action
                      console.log("Strategic review action triggered");
                      break;
                    case "budget_reallocation":
                      // Handle budget reallocation action
                      console.log("Budget reallocation action triggered");
                      break;
                    case "executive_summary":
                      // Handle executive summary action
                      console.log("Executive summary action triggered");
                      break;
                    default:
                      console.log("Unknown action:", action.action);
                  }
                }}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
                  action.variant === "primary"
                    ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 shadow-md"
                    : action.action === "export"
                    ? "border-2 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 hover:text-green-800 dark:hover:text-green-200"
                    : action.action === "archive"
                    ? "border-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-800 dark:hover:text-red-200"
                    : action.action === "mass_update"
                    ? "border-2 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-800 dark:hover:text-blue-200"
                    : "border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4">{action.icon}</span>
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Project Selection Info */}
        {selectedProjects.length > 0 &&
          ["PJM", "PMO", "ADMIN"].includes(activeView) && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-3 sm:p-4 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 font-medium">
                    {selectedProjects.length} project(s) selected
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProjects([])}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:text-white dark:text-blue-400 border-2 border-blue-300 hover:border-blue-600 rounded-lg transition-all duration-200 hover:bg-blue-600 dark:hover:bg-blue-500 transform hover:scale-105 w-full sm:w-auto"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-200 dark:border-orange-900 border-t-orange-600 dark:border-t-orange-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FolderOpen size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="mt-6 text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300">
              Loading projects...
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please wait while we fetch your projects
            </p>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((project) => renderProjectCard(project))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <FolderOpen size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No projects found
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 px-4">
              {filters.search || filters.status || filters.portfolio
                ? "Try adjusting your filters to see more results."
                : "No projects are available for your current role."}
            </p>
            {getRoleSpecificActions(activeView).length > 0 &&
              ["PJM", "PMO", "ADMIN"].includes(activeView) && (
                <button
                  onClick={() => router.push("/projects/create")}
                  className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-medium text-sm sm:text-base transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:from-orange-700 hover:to-orange-800 mx-auto"
                >
                  <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>Create New Project</span>
                </button>
              )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          projectName={projectToDelete?.name || ""}
          isDeleting={isDeleting}
        />

        {/* Mass Update Modal */}
        <MassUpdateModal
          isOpen={showMassUpdateModal}
          onClose={() => setShowMassUpdateModal(false)}
          selectedProjects={selectedProjects}
          onSuccess={handleMassUpdateSuccess}
        />

        {/* Archived Projects Modal */}
        <ArchivedProjectsModal
          isOpen={showArchivedModal}
          onClose={() => setShowArchivedModal(false)}
          onRestore={handleArchivedRestore}
        />

        {/* Edit Project Modal */}
        <EditProjectModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setProjectToEdit(null);
          }}
          project={projectToEdit}
          onSuccess={handleEditSuccess}
        />

        {/* Template Manager Modal */}
        {showTemplateManager && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTemplateManager(false);
              }
            }}
          >
            <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/30">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg backdrop-blur-sm"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Excel Template Manager
                  </h2>
                  <button
                    onClick={() => setShowTemplateManager(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={24} />
                  </button>
                </div>
                <ProjectTemplateManager
                  onProjectsCreated={() => {
                    loadProjects();
                    // Don't close modal automatically - let user review results
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Full-page loading overlay during deletion */}
        {isDeleting && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-slate-700">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Deleting Project
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please wait while we delete the project and all associated data. This may take a moment...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default ProjectsPage;
