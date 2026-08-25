"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Delete EPS
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-red-600 dark:text-red-400">
            {epsName}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mb-6">
          <label
            htmlFor="confirmDelete"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Type{" "}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {epsName}
            </span>{" "}
            to confirm deletion
          </label>
          <input
            type="text"
            id="confirmDelete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Enter EPS name to confirm"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || !canDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              EPS not found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The EPS you're looking for doesn't exist or you don't have
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

  const roleSpecificTabs = getRoleSpecificTabs();
  const roleSpecificActions = getRoleSpecificActions(activeView);

  // Add tab navigation for Overview and Projects
  const epsTabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "projects", label: "Projects", icon: <FolderTree size={16} /> },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout onViewChange={setActiveView} activeView={activeView}>
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <button
            onClick={() => router.push("/eps")}
            className="hover:text-orange-600 transition-colors"
          >
            EPS
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{eps.name}</span>
        </div>

        {/* EPS Header */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {eps.name}
                </h1>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Level {eps.level}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  {eps.eps_code}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {eps.description}
              </p>
            </div>
          </div>

          {/* Progress and Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Projects
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {Array.isArray(eps.projects) ? eps.projects.length : 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Budget
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(
                    Array.isArray(eps.projects)
                      ? eps.projects.reduce(
                          (sum, project) => sum + (project.budget_amount || 0),
                          0
                        )
                      : 0
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Average Progress
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {Array.isArray(eps.projects) && eps.projects.length > 0
                    ? `${Math.round(
                        eps.projects.reduce(
                          (sum, project) =>
                            sum + (project.progress_percentage || 0),
                          0
                        ) / eps.projects.length
                      )}%`
                    : "0%"}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      Array.isArray(eps.projects) && eps.projects.length > 0
                        ? Math.round(
                            eps.projects.reduce(
                              (sum, project) =>
                                sum + (project.progress_percentage || 0),
                              0
                            ) / eps.projects.length
                          )
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Health Score
                </span>
                <span className="text-lg font-bold text-green-600">
                  {Array.isArray(eps.projects) && eps.projects.length > 0
                    ? `${Math.round(
                        eps.projects.reduce(
                          (sum, project) => sum + (project.healthScore || 0),
                          0
                        ) / eps.projects.length
                      )}%`
                    : "0%"}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      Array.isArray(eps.projects) && eps.projects.length > 0
                        ? Math.round(
                            eps.projects.reduce(
                              (sum, project) =>
                                sum + (project.healthScore || 0),
                              0
                            ) / eps.projects.length
                          )
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Level {eps.level} EPS
              </span>
              <span className="text-sm text-gray-500">
                Created on {formatDate(eps.created_at)}
              </span>
              {/* <span className="text-sm text-gray-500">
                • Created by {eps.created_by || 'N/A'}
              </span> */}
            </div>
            <div className="flex items-center space-x-2">
              {roleSpecificActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.action === "edit") handleEditClick();
                    else if (action.action === "delete") handleDeleteClick();
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    action.variant === "primary"
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : action.variant === "danger"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mb-6">
          <div className="flex items-center space-x-1 p-1 overflow-x-auto whitespace-nowrap">
            {epsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-orange-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main EPS Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* EPS Details */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    EPS Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        EPS Code
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {eps.eps_code}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Level
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {eps.level}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Parent EPS
                      </label>
                      {eps.parent_eps_id && eps.parent ? (
                        <button
                          onClick={() => {
                            if (eps.parent) {
                              router.push(`/eps/${eps.parent.eps_id}`);
                            }
                          }}
                          className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline"
                        >
                          {eps.parent.name} (Level {eps.parent.level})
                        </button>
                      ) : eps.parent_eps_id ? (
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          Level {eps.level - 1} EPS (ID: {eps.parent_eps_id})
                        </p>
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          None
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Total Projects
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {eps.projects.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {eps.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Quick Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Projects
                      </span>
                      <span className="text-sm font-medium text-orange-600">
                        {Array.isArray(eps.projects) ? eps.projects.length : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
