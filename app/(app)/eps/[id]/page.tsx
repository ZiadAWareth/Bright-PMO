"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FormSection, InfoGrid, StatusBadge } from "@/components/ui/form-shell";
import {
  ArrowLeft,
  Edit,
  Star,
  Share2,
  MoreHorizontal,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  BarChart3,
  Target,
  Shield,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  Archive,
  Trash2,
  UserPlus,
  Upload,
  Download,
  MessageSquare,
  Bell,
  Eye,
  Lock,
  Unlock,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  MapPin,
  Building,
  Activity,
  FolderTree,
  Plus,
  Layers,
  X,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";
// Removed EpsEditForm import since we're using dedicated edit page
import ProjectsTab from "@/components/ProjectsTab";
import { Spinner } from "@/components/ui/spinner";
import { TabRow } from "@/components/ui/tab-row";


// User interface for role checking
interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  role: {
    role_name?: string;
    name?: string;
  };
}

interface EPS {
  eps_id: number;
  eps_code: string;
  name: string;
  description: string | null;
  level: number;
  parent_eps_id: number | null;
  projects: any[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  parent?: ParentEPS | null;
}

interface ParentEPS {
  eps_id: number;
  name: string;
  level: number;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  epsName: string;
  isDeleting: boolean;
}

const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  epsName,
  isDeleting,
}: DeleteModalProps) => {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === epsName;

  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownOnBackdrop(true);
    } else {
      setMouseDownOnBackdrop(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnBackdrop) {
      onClose();
    }
    setMouseDownOnBackdrop(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-surface rounded-xl p-6 max-w-md w-full shadow-2xl border border-line">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">
            Delete EPS
          </h2>
          <button
            onClick={onClose}
            className="text-faint hover:text-muted"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-muted mb-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-danger">
            {epsName}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mb-6">
          <label
            htmlFor="confirmDelete"
            className="block text-sm font-medium text-ink-3 mb-2"
          >
            Type{" "}
            <span className="font-semibold text-danger">
              {epsName}
            </span>{" "}
            to confirm deletion
          </label>
          <input
            type="text"
            id="confirmDelete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-bright"
            placeholder="Enter EPS name to confirm"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-3 hover:bg-surface-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || !canDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-danger hover:opacity-90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EPSDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState("admin");
  const [activeTab, setActiveTab] = useState("overview");
  const [eps, setEps] = useState<EPS | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [epsId, setEpsId] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission checking function
  const canManageEPS = () => {
    if (!user || !user.role) {
      return false;
    }
    const roleName = user.role.role_name || user.role.name;
    return roleName && ["PMO", "PJM", "ADMIN"].includes(roleName);
  };

  // Check if user data is loaded and user can manage EPS
  const canShowManagementButtons = () => {
    return user && user.role && canManageEPS();
  };

  // Fetch user data function
  const fetchUserData = async () => {
    try {
      const response = await axios.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setEpsId(resolvedParams.id);
    };
    getParams();
    fetchUserData();
  }, [params]);

  useEffect(() => {
    if (!epsId) return;

    setLoading(true);
    axios
      .get(`/api/eps/${epsId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        console.log("EPS data fetched:", res.data);
        const data = res.data;
        
        // Validate the received data
        if (!data || !data.eps_id || !data.name) {
          console.error("Invalid EPS data received:", data);
          toast.error("Invalid EPS data received from server");
          setLoading(false);
          return;
        }
        
        setEps({
          ...data,
          // Ensure all required fields have proper values
          eps_code: data.eps_code || `EPS-${data.eps_id}`,
          description: data.description || null,
          level: data.level || 1,
          parent_eps_id: data.parent_eps_id || null,
          projects: Array.isArray(data.projects) ? data.projects : [],
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching EPS data:", err);
        const errorMessage = err.response?.data?.error || "Failed to fetch EPS data";
        toast.error(errorMessage);
        setLoading(false);
      });
  }, [epsId]);

  // Remove allEps fetching since we're not using edit modal anymore

  const handleDeleteClick = () => {
    // Check if user data is loaded
    if (!user || !user.role) {
      toast.error("Please wait for the page to fully load before deleting.");
      return;
    }

    if (!canManageEPS()) {
      toast.error("You don't have permission to delete EPS entries");
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eps) return;

    setIsDeleting(true);
    try {
      const response = await axios.delete(`/api/eps/${eps.eps_id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.status === 200) {
        toast.success("EPS and all associated projects deleted successfully");
        router.push("/eps");
      }
    } catch (error: any) {
      console.error("Error deleting EPS:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to delete EPS";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleEditClick = () => {
    // Check if user data is loaded
    if (!user || !user.role) {
      toast.error("Please wait for the page to fully load before editing.");
      return;
    }

    if (!canManageEPS()) {
      toast.error("You don't have permission to edit EPS entries");
      return;
    }

    // Defensive checks for production issues
    if (!eps || !eps.eps_id) {
      console.error("Invalid EPS data when trying to edit:", eps);
      toast.error("EPS data is not available. Please refresh the page and try again.");
      return;
    }

    if (loading) {
      toast.error("EPS data is still loading. Please wait and try again.");
      return;
    }

    // Navigate to edit page instead of opening modal
    router.push(`/eps/${eps.eps_id}/edit`);
  };

  // Remove handleEditSuccess since we're not using modals anymore

  // Get role-specific tabs
  const getRoleSpecificTabs = () => [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "projects", label: "Projects", icon: <FolderTree size={16} /> },
  ];

  // Get role-specific actions
  const getRoleSpecificActions = (role: string) => {
    // Only show actions if user has management permissions
    if (!canManageEPS()) {
      return [];
    }

    switch (role) {
      case "admin":
        return [
          {
            label: "Edit EPS",
            icon: <Edit size={16} />,
            action: "edit",
            variant: "primary",
          },
          {
            label: "Delete",
            icon: <Trash2 size={16} />,
            action: "delete",
            variant: "danger",
          },
        ];
      case "project-manager":
        return [
          {
            label: "Generate Report",
            icon: <Download size={16} />,
            action: "generate_report",
            variant: "secondary",
          },
        ];
      default:
        return [];
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Defensive: log eps and eps.projects before rendering
  console.log('EPS object:', eps);
  if (eps && typeof eps.projects === 'undefined') {
    console.error('EPS.projects is undefined!');
    eps.projects = [];
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout onViewChange={setActiveView} activeView={activeView}>
          <div className="flex items-center justify-center min-h-96">
            <Spinner size={48} className="text-bright-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!eps) {
    return (
      <ProtectedRoute>
        <DashboardLayout onViewChange={setActiveView} activeView={activeView}>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-ink mb-2">
              EPS not found
            </h3>
            <p className="text-muted mb-4">
              The EPS you're looking for doesn't exist or you don't have
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

  const roleSpecificTabs = getRoleSpecificTabs();
  const roleSpecificActions = getRoleSpecificActions(activeView);

  // Add tab navigation for Overview and Projects
  const epsTabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "projects", label: "Projects", icon: <FolderTree size={16} /> },
  ];

  const projectList = Array.isArray(eps.projects) ? eps.projects : [];
  const projectCount = projectList.length;
  const totalBudget = projectList.reduce(
    (sum, project) => sum + (project.budget_amount || 0),
    0,
  );
  // Averages over an empty EPS are 0 rather than NaN.
  const averageProgress = projectCount
    ? Math.round(
        projectList.reduce(
          (sum, project) => sum + (project.progress_percentage || 0),
          0,
        ) / projectCount,
      )
    : 0;
  const averageHealth = projectCount
    ? Math.round(
        projectList.reduce(
          (sum, project) => sum + (project.healthScore || 0),
          0,
        ) / projectCount,
      )
    : 0;

  const epsRows: [string, React.ReactNode][] = [
    ["EPS Code", <StatusBadge key="code" label={eps.eps_code} tone="neutral" />],
    ["Level", <StatusBadge key="level" label={`Level ${eps.level}`} tone="info" />],
    [
      "Parent EPS",
      eps.parent_eps_id && eps.parent ? (
        <button
          key="parent"
          onClick={() => {
            if (eps.parent) router.push(`/eps/${eps.parent.eps_id}`);
          }}
          className="text-[13.5px] font-medium text-bright transition-colors hover:text-bright-deep hover:underline"
        >
          {eps.parent.name} (Level {eps.parent.level})
        </button>
      ) : eps.parent_eps_id ? (
        `Level ${eps.level - 1} EPS (ID: ${eps.parent_eps_id})`
      ) : (
        "None"
      ),
    ],
    ["Total Projects", <span key="count" className="tabular-nums">{projectCount}</span>],
    ["Total Budget", <span key="budget" className="tabular-nums">{formatCurrency(totalBudget)}</span>],
    ["Created", formatDate(eps.created_at)],
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout
        title={eps.name}
        subtitle={eps.description}
        backHref="/eps"
        backLabel="Back to EPS"
        actions={roleSpecificActions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              if (action.action === "edit") handleEditClick();
              else if (action.action === "delete") handleDeleteClick();
            }}
            className={`inline-flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-semibold transition-colors ${
              action.variant === "primary"
                ? "bg-bright text-white hover:bg-bright-deep"
                : action.variant === "danger"
                  ? "border border-line text-muted hover:border-danger hover:bg-danger-soft hover:text-danger"
                  : "border border-line text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
        onViewChange={setActiveView}
        activeView={activeView}
      >
        <FormSection title="Rollup" className="mb-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
            <div>
              <p className="text-[12px] text-muted">Total Projects</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">
                {projectCount}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted">Total Budget</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted">Average Progress</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">
                {averageProgress}%
              </p>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={`Average progress ${averageProgress} percent`}
              >
                <div
                  className="h-full rounded-full bg-info transition-[width] duration-300"
                  style={{ width: `${averageProgress}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-[12px] text-muted">Health Score</p>
              <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">
                {averageHealth}%
              </p>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={`Average health score ${averageHealth} percent`}
              >
                <div
                  className="h-full rounded-full bg-success transition-[width] duration-300"
                  style={{ width: `${averageHealth}%` }}
                />
              </div>
            </div>
          </div>
        </FormSection>

        <TabRow tabs={epsTabs} value={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <FormSection title="EPS Information">
                <InfoGrid rows={epsRows} />
              </FormSection>

              {eps.description && (
                <FormSection title="Description">
                  <p className="whitespace-pre-line text-[13.5px] text-ink">
                    {eps.description}
                  </p>
                </FormSection>
              )}
            </div>
          )}

          {activeTab === "projects" && (
            <ProjectsTab
              projects={Array.isArray(eps.projects) ? eps.projects : []}
              activeView={activeView}
              projectCount={Array.isArray(eps.projects) ? eps.projects.length : 0}
            />
          )}
        </div>

        {/* Edit modal removed - now using dedicated edit page */}

        {/* Delete Modal */}
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          epsName={eps.name}
          isDeleting={isDeleting}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default EPSDetailPage;
