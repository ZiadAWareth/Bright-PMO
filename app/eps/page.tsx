// EPS Directory Page (Projects Directory UI)
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Layers,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { format } from "date-fns";
import EpsCreateForm from "@/components/EpsCreateForm";


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
  status?: string;
  manager?: string;
  planned_end_date?: string;
  budget_amount?: number;
  progress_percentage?: number;
}

interface FilterState {
  search: string;
  level: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  epsName: string;
  isDeleting: boolean;
  children?: EPS[];
  totalChildCount?: number;
  useCascadeDelete?: boolean;
  onCascadeDeleteChange?: (value: boolean) => void;
}

const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  epsName,
  isDeleting,
  children = [],
  totalChildCount = 0,
  useCascadeDelete = false,
  onCascadeDeleteChange,
}: DeleteModalProps) => {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === epsName;
  const hasChildren = children && children.length > 0;
  const effectiveTotalCount = totalChildCount > 0 ? totalChildCount : children.length;

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
      className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Trash2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete EPS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
          >
            <X size={20} />
          </button>
        </div>
        {hasChildren && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Warning: This EPS has {children.length} direct child {children.length === 1 ? 'EPS' : 'EPS entries'}
                  {totalChildCount > children.length && ` (${totalChildCount} total including nested children)`}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  Deleting this EPS will also delete all child EPS entries. This action cannot be undone.
                </p>
                {children.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Direct children:</p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                      {children.slice(0, 3).map((child) => (
                        <li key={child.eps_id}>{child.name} (Level {child.level})</li>
                      ))}
                      {children.length > 3 && (
                        <li>... and {children.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCascadeDelete}
                    onChange={(e) => onCascadeDeleteChange?.(e.target.checked)}
                    className="mr-2 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                    I understand this will delete {effectiveTotalCount > 0 ? `${effectiveTotalCount + 1} total EPS entries` : `all child EPS entries`}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {hasChildren ? (
            <>
              {useCascadeDelete ? (
                <>
                  You are about to delete{" "}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {epsName}
                  </span>
                  {" "}and all its child EPS entries. This action cannot be undone.
                </>
              ) : (
                <>
                  Enable cascade delete above to delete this EPS and all its children.
                </>
              )}
            </>
          ) : (
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">
                {epsName}
              </span>
              ? This action cannot be undone.
            </>
          )}
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
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || !canDelete || (hasChildren && !useCascadeDelete)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting 
              ? "Deleting..." 
              : hasChildren && !useCascadeDelete
              ? "Enable Cascade Delete First"
              : hasChildren
              ? `Delete ${effectiveTotalCount > 0 ? `${effectiveTotalCount + 1} EPS Entries` : 'EPS and Children'}`
              : "Delete EPS"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EPSPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [epsList, setEpsList] = useState<EPS[]>([]);
  const [filteredEps, setFilteredEps] = useState<EPS[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    level: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [epsToDelete, setEpsToDelete] = useState<EPS | null>(null);
  const [epsChildren, setEpsChildren] = useState<EPS[]>([]);
  const [totalChildCount, setTotalChildCount] = useState<number>(0);
  const [useCascadeDelete, setUseCascadeDelete] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Permission checking function
  const canManageEPS = () => {
    if (!user || !user.role) {
      return false; // Don't log warning, just return false
    }
    const roleName = user.role.role_name || user.role.name;
    return roleName && ["PMO", "PJM", "ADMIN"].includes(roleName);
  };

  // Enhanced permission checking (optional - for future use)
  const canEditSpecificEPS = (eps: EPS) => {
    if (!canManageEPS()) return false;
    
    // Additional business logic could be added here:
    // - Check if user created the EPS
    // - Check if user is assigned to projects under this EPS
    // - Check specific permissions from user.role.permissions JSON
    
    const roleName = user?.role?.role_name || user?.role?.name;
    
    // Example: Only ADMIN can edit Level 1 EPS
    if (eps.level === 1 && roleName !== "ADMIN") {
      return false;
    }
    
    // Example: Check if user has specific EPS permissions
    // const permissions = user?.role?.permissions || {};
    // if (!permissions.eps_edit) return false;
    
    return true;
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
      console.error("Failed to fetch user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchEps();
  }, []);

  const fetchEps = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/eps", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      
      // Sanitize and validate EPS data
      const raw = response.data;
      console.log("Raw EPS data from API:", raw);
      
      if (!Array.isArray(raw)) {
        console.error("API did not return an array:", raw);
        toast.error("Invalid data format received from server");
        setEpsList([]);
        setFilteredEps([]);
        return;
      }

      const epsData = raw.map((e) => {
        // Validate required EPS fields
        if (!e || !e.eps_id || !e.name) {
          console.error("Invalid EPS object:", e);
          return null;
        }
        
        return {
          ...e,
          // Ensure all required fields have default values
          eps_code: e.eps_code || `EPS-${e.eps_id}`,
          description: e.description || null,
          level: e.level || 1,
          parent_eps_id: e.parent_eps_id || null,
          projects: Array.isArray(e.projects) ? e.projects : [],
          created_at: e.created_at || new Date().toISOString(),
          updated_at: e.updated_at || new Date().toISOString(),
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log("Sanitized EPS data:", epsData);
      setEpsList(epsData);
      setFilteredEps(epsData);
    } catch (error: any) {
      console.error("Error fetching EPS data:", error);
      const errorMessage = error.response?.data?.error || "Failed to fetch EPS data";
      toast.error(errorMessage);
      setEpsList([]);
      setFilteredEps([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const filtered = epsList.filter((eps) => {
      const matchesSearch =
        !filters.search ||
        eps.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        eps.eps_code.toLowerCase().includes(filters.search.toLowerCase()) ||
        eps.description?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesLevel =
        !filters.level || eps.level.toString() === filters.level;
      return matchesSearch && matchesLevel;
    });
    setFilteredEps(filtered);
  }, [filters, epsList]);

  // Helper function to recursively count all children
  const countAllChildren = (parentId: number): number => {
    const directChildren = epsList.filter((e) => e.parent_eps_id === parentId);
    let count = directChildren.length;
    
    // Recursively count grandchildren
    for (const child of directChildren) {
      count += countAllChildren(child.eps_id);
    }
    
    return count;
  };

  const handleDeleteClick = async (eps: EPS) => {
    // Check if user data is loaded
    if (!user || !user.role) {
      toast.error("Please wait for the page to fully load before deleting.");
      return;
    }

    if (!canManageEPS()) {
      toast.error("You don't have permission to delete EPS entries");
      return;
    }

    // Check if EPS has children in the current list
    const children = epsList.filter((e) => e.parent_eps_id === eps.eps_id);
    const totalCount = countAllChildren(eps.eps_id);
    
    setEpsChildren(children);
    setTotalChildCount(totalCount);
    setEpsToDelete(eps);
    setUseCascadeDelete(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!epsToDelete) return;
    
    // If has children but cascade not enabled, show error
    if (epsChildren.length > 0 && !useCascadeDelete) {
      toast.error("Please enable cascade delete to delete EPS with children");
      return;
    }
    
    setIsDeleting(true);
    try {
      // Add cascade parameter if cascade delete is enabled
      const url = useCascadeDelete 
        ? `/api/eps/${epsToDelete.eps_id}?cascade=true`
        : `/api/eps/${epsToDelete.eps_id}`;
      
      const response = await axios.delete(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.status === 200) {
        // Refresh the EPS list to reflect deletions
        await fetchEps();
        const message = useCascadeDelete && response.data.deletedCount
          ? `Successfully deleted ${response.data.deletedCount} EPS ${response.data.deletedCount === 1 ? 'entry' : 'entries'}`
          : "EPS deleted successfully";
        toast.success(message);
        setShowDeleteModal(false);
        setEpsToDelete(null);
        setEpsChildren([]);
        setTotalChildCount(0);
        setUseCascadeDelete(false);
      }
    } catch (error: any) {
      console.error("Error deleting EPS:", error);
      
      // If error indicates cascade is required, update the modal state
      if (error.response?.data?.requiresCascade) {
        setTotalChildCount(error.response.data.totalChildCount || epsChildren.length);
        toast.error(error.response.data.message || error.response.data.error);
      } else {
        const errorMessage =
          error.response?.data?.error || "Failed to delete EPS";
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setEpsToDelete(null);
    setEpsChildren([]);
    setTotalChildCount(0);
    setUseCascadeDelete(false);
  };

  const toggleExpand = (epsId: number) => {
    setExpanded((prev) =>
      prev.includes(epsId)
        ? prev.filter((id) => id !== epsId)
        : [...prev, epsId]
    );
  };

  const handleEditClick = (eps: EPS) => {
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
      console.error("Invalid EPS object passed to handleEditClick:", eps);
      toast.error("Invalid EPS data. Please refresh the page and try again.");
      return;
    }

    if (isLoading) {
      toast.error("Data is still loading. Please wait and try again.");
      return;
    }

    // Navigate to edit page instead of showing modal
    router.push(`/eps/${eps.eps_id}/edit`);
  };

  // Remove handleEditSuccess since we're not using modals anymore

  const handleCreateClick = () => {
    // Check if user data is loaded
    if (!user || !user.role) {
      toast.error("Please wait for the page to fully load before creating.");
      return;
    }

    if (!canManageEPS()) {
      toast.error("You don't have permission to create EPS entries");
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchEps();
  };

  // Loading component
  const renderLoader = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading EPS data...</p>
      </div>
    </div>
  );

  // Helper for level color dot
  const getLevelDot = (level: number) => {
    const colors = [
      "bg-purple-400 dark:bg-purple-500",
      "bg-blue-400 dark:bg-blue-500",
      "bg-green-400 dark:bg-green-500",
      "bg-yellow-400 dark:bg-yellow-500",
      "bg-orange-400 dark:bg-orange-500",
      "bg-pink-400 dark:bg-pink-500",
    ];
    return (
      <span
        className={`inline-block w-3 h-3 rounded-full mr-2 ${
          colors[(level - 1) % colors.length]
        }`}
      ></span>
    );
  };

  // Helper for card background by level
  const getCardBg = (level: number) => {
    const lightColors = [
      "bg-purple-50 dark:bg-purple-900/20",
      "bg-blue-50 dark:bg-blue-900/20",
      "bg-green-50 dark:bg-green-900/20",
      "bg-yellow-50 dark:bg-yellow-900/20",
      "bg-orange-50 dark:bg-orange-900/20",
      "bg-pink-50 dark:bg-pink-900/20",
    ];
    return lightColors[(level - 1) % lightColors.length];
  };

  // EPS tree node rendering with defensive checks
  const renderEpsTree = (parentId: number | null, level: number = 0) => {
    // When a level filter is active, show all entries at that level regardless of parent
    // Only do this at the root level (parentId === null)
    if (filters.level && parentId === null) {
      const targetLevel = parseInt(filters.level);
      const levelFilteredEps = filteredEps.filter((eps) => eps.level === targetLevel);
      return levelFilteredEps
        .map((eps, idx, arr) => {
          return renderEpsNode(eps, idx, arr, 0, false); // Don't show children when filtering
        })
        .filter(Boolean);
    }
    
    // Normal tree rendering when no level filter or when rendering children
    return filteredEps
      .filter((eps) => eps.parent_eps_id === parentId)
      .map((eps, idx, arr) => {
        return renderEpsNode(eps, idx, arr, level, true); // Show children in normal mode
      })
      .filter(Boolean);
  };

  // Helper function to render a single EPS node
  const renderEpsNode = (eps: EPS, idx: number, arr: EPS[], level: number, showChildren: boolean) => {
    // Defensive: ensure eps object is valid
    if (!eps || !eps.eps_id) {
      console.error('Invalid EPS object in renderEpsNode:', eps);
      return null;
    }
    
    // Ensure projects array exists
    if (typeof eps.projects === 'undefined' || !Array.isArray(eps.projects)) {
      console.warn('EPS.projects is invalid for EPS:', eps.eps_id, 'Setting to empty array');
      eps.projects = [];
    }
    const hasChildren = showChildren && filteredEps.some(
      (child) => child.parent_eps_id === eps.eps_id
    );
    const isExpanded = expanded.includes(eps.eps_id);
    const manager = eps.manager || "";
    const endDate = eps.planned_end_date
      ? (eps.planned_end_date ? format(new Date(eps.planned_end_date), "yyyy-MM-dd") : "")
      : "";
    const budget = eps.budget_amount
      ? eps.budget_amount.toLocaleString()
      : "";
    const progress =
      typeof eps.progress_percentage === "number"
        ? eps.progress_percentage
        : null;
    const showLine = arr.length > 1 && idx < arr.length - 1;
    return (
      <div
        key={eps.eps_id}
        className="relative"
        style={{ marginLeft: level * 32 }}
      >
        {level > 0 && showLine && (
          <div className="absolute left-0 top-0 h-full w-4 flex justify-center">
            <div className="w-0.5 bg-gray-200 dark:bg-slate-700 h-full" />
          </div>
        )}
        <div
          className={`flex items-center ${getCardBg(
            eps.level
          )} border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition group mb-2`}
          style={{ minHeight: 56 }}
        >
          {hasChildren && (
            <button
              className="mr-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(eps.eps_id);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          {getLevelDot(eps.level)}
          <Layers size={18} className="text-gray-400 mr-2" />
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => router.push(`/eps/${eps.eps_id}`)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
                {eps.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium">
                Level {eps.level}
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 text-xs font-medium">
                {eps.eps_code}
              </span>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-medium">
                {Array.isArray(eps.projects) ? eps.projects.length : 0} projects
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
              {manager && (
                <span className="flex items-center">
                  <Users size={12} className="mr-1" />
                  {manager}
                </span>
              )}
              {endDate && (
                <span className="flex items-center">
                  <Calendar size={12} className="mr-1" />
                  {endDate}
                </span>
              )}
              {budget && (
                <span className="flex items-center">
                  <DollarSign size={12} className="mr-1" />
                  {budget}
                </span>
              )}
            </div>
          </div>
          {progress !== null && (
            <div className="w-20 ml-4">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-2 rounded-full ${
                    progress > 90
                      ? "bg-red-400"
                      : progress > 75
                      ? "bg-yellow-400"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 ml-2 opacity-100 group-hover:opacity-100 transition-opacity">
            {canShowManagementButtons() && !isLoading && (
              <>
                <button
                  className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLoading) {
                      handleEditClick(eps);
                    }
                  }}
                >
                  <Edit size={16} />
                </button>
                <button
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLoading) {
                      handleDeleteClick(eps);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && showChildren && (
          <div>{renderEpsTree(eps.eps_id, level + 1)}</div>
        )}
      </div>
    );
  };

  // Top bar
  const renderTopBar = () => (
    <div className="flex flex-wrap items-center justify-between mb-6 gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          EPS Management
        </h2>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          Enterprise Project Structure
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <Filter size={16} />
          <span className="text-sm">Filters</span>
        </button>
        {canShowManagementButtons() && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm">New EPS</span>
          </button>
        )}
      </div>
    </div>
  );

  // Filters bar
  const renderFilters = () => (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search EPS..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
      <div>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Levels</option>
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <DashboardLayout title="EPS Management" onViewChange={() => {}} activeView="admin">
        {renderTopBar()}
        {showFilters && renderFilters()}

        {isLoading ? (
          renderLoader()
        ) : (
          <>
            <div className="mt-2">{renderEpsTree(null)}</div>
            {filteredEps.length === 0 && (
              <div className="text-center py-12">
                <Layers size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No EPS entries found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {filters.search || filters.level
                    ? "Try adjusting your filters to see more results."
                    : "No EPS entries are available."}
                </p>
                {canShowManagementButtons() && (
                  <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mx-auto"
                  >
                    <Plus size={16} />
                    <span>New EPS</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
        <DeleteModal
          isOpen={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          epsName={epsToDelete?.name || ""}
          isDeleting={isDeleting}
          children={epsChildren}
          totalChildCount={totalChildCount}
          useCascadeDelete={useCascadeDelete}
          onCascadeDeleteChange={setUseCascadeDelete}
        />
        {/* Edit modal removed - now using dedicated edit page */}

        {/* Create Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                (e.currentTarget as HTMLElement).setAttribute('data-mousedown-backdrop', 'true');
              } else {
                (e.currentTarget as HTMLElement).removeAttribute('data-mousedown-backdrop');
              }
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && (e.currentTarget as HTMLElement).hasAttribute('data-mousedown-backdrop')) {
                setShowCreateModal(false);
              }
              (e.currentTarget as HTMLElement).removeAttribute('data-mousedown-backdrop');
            }}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-white dark:bg-slate-800 rounded-full p-1 shadow-lg"
              >
                <X size={20} />
              </button>
              <EpsCreateForm
                allEps={epsList}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
                showCloseButton={false}
              />
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default EPSPage;
