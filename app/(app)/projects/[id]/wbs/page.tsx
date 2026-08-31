"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
// Add global styles for animations
const globalStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
`;
// Insert global styles into document head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = globalStyles;
  document.head.appendChild(style);
}
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Copy,
  Upload,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Eye,
  Move,
  Filter,
  Search,
  RefreshCw,
  Archive,
  PlusCircle,
  Share2,
  Layers,
  TrendingUp,
  Activity,
  ArrowLeft,
  Save,
} from "lucide-react";
import axios from "axios";
import WBSTemplateManager from "@/components/WBSTemplateManager";
import CreateWBSForm from "@/components/wbs/CreateWBSForm";
import { Dropdown } from "@/components/ui/dropdown";
import { StatGrid, StatTile } from "@/components/ui/entity-card";
import { StatusBadge } from "@/components/ui/form-shell";
import { wbsStatusTone } from "@/lib/status-tone";
// Helper function to safely format dates
const formatDateSafely = (dateValue: string | null | undefined): string => {
  if (!dateValue) return "Not set";
  try {
    const date = new Date(dateValue);
    // Check if date is valid (not NaN and not Unix epoch)
    if (isNaN(date.getTime()) || date.getFullYear() < 1971) {
      return "Not set";
    }
    return date.toLocaleDateString();
  } catch (error) {
    return "Not set";
  }
};
interface WBSItem {
  wbs_id: number;
  project_id: number;
  parent_wbs_id: number | null;
  wbs_code: string;
  name: string;
  description: string;
  level: number;
  start_date: string;
  end_date: string;
  budget_amount: number;
  actual_cost: number;
  progress_percentage: number;
  progress_weight?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  children?: WBSItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
}
interface Project {
  project_id: number;
  project_code: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  planned_end_date: string;
  budget_amount: number;
  progress_percentage: number;
}
const ProjectWBSPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [activeView, setActiveView] = useState("admin");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [wbsData, setWbsData] = useState<WBSItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [showDetails, setShowDetails] = useState(false);
  const [selectedWBS, setSelectedWBS] = useState<WBSItem | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statistics, setStatistics] = useState<{
    overall_progress: number;
    total_budget: number;
    total_spent: number;
    budget_utilization: number;
    wbs_count: number;
  } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  }); // Delete confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WBSItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    level: "",
    progressMin: "",
    progressMax: "",
    budgetMin: "",
    budgetMax: "",
  });
  // Fix hydration mismatch by only accessing localStorage after mount
  const [token, setToken] = useState<string | null>(null);
  // Template modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  // Add at the top of the component, after hooks
  const [showNavButtons, setShowNavButtons] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      setShowNavButtons(from === "setup" || from === "previous");
    }
  }, []);
  useEffect(() => {
    setMounted(true);
    setToken(localStorage.getItem("token"));
  }, []);
  useEffect(() => {
    if (mounted && token) {
      fetchProjectData();
      fetchWBSData();
      fetchStatistics();
      fetchUserRole();
    }
  }, [projectId, mounted, token]);
  const fetchUserRole = async () => {
    try {
      const response = await axios.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserRole(response.data.user.role.name);
      setActiveView(response.data.user.role.name);
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  };
  // Helper function to check if user can edit WBS
  const canEditWBS = () => {
    return userRole === "PJM" || userRole === "PMO" || userRole === "ADMIN";
  };
  const fetchProjectData = async () => {
    try {
      const response = await axios
        .get(`/api/projects/${projectId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          setProject(res.data);
        });
    } catch (error) {
      console.error("Error fetching project:", error);
    }
  };
  const fetchStatistics = async () => {
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/statistics`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setStatistics(response.data);
    } catch (error) {
      console.error("Error fetching project statistics:", error);
    }
  };
  const refreshWBSAndStats = async () => {
    await fetchWBSData();
    await fetchStatistics();
  };
  const fetchWBSData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/wbs`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      // Budget already included in response (budget_amount, actual_cost, budgets)
      const hierarchicalWBS = buildHierarchy(response.data);
      setWbsData(hierarchicalWBS);
    } catch (error) {
      console.error("Error fetching WBS data:", error);
    } finally {
      setLoading(false);
    }
  };
  const buildHierarchy = (items: WBSItem[]): WBSItem[] => {
    const itemMap = new Map<number, WBSItem>();
    const rootItems: WBSItem[] = [];
    // Create a map of all items
    items.forEach((item) => {
      itemMap.set(item.wbs_id, {
        ...item,
        children: [],
        isExpanded: true,
        isSelected: false,
      });
    });
    // Build the hierarchy
    items.forEach((item) => {
      const wbsItem = itemMap.get(item.wbs_id)!;
      if (item.parent_wbs_id === null) {
        rootItems.push(wbsItem);
      } else {
        const parent = itemMap.get(item.parent_wbs_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(wbsItem);
        }
      }
    });
    return rootItems;
  };
  // Helper function to recursively find WBS item by ID
  const findWBSItemById = (
    items: WBSItem[],
    targetId: number
  ): WBSItem | undefined => {
    for (const item of items) {
      if (item.wbs_id === targetId) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findWBSItemById(item.children, targetId);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  };
  const createSingleWBS = async (formData: {
    name: string;
    description: string;
    level: number;
    start_date: string;
    end_date: string;
    budget_amount: number;
    parent_wbs_id?: number | null;
    progress_weight?: number | null;
  }) => {
    try {
      setCreating(true);
      // Validation: Check if level 0 already exists
      if (formData.level === 0) {
        const flattenWBS = (items: WBSItem[]): WBSItem[] => {
          let result: WBSItem[] = [];
          items.forEach((item) => {
            result.push(item);
            if (item.children) {
              result = result.concat(flattenWBS(item.children));
            }
          });
          return result;
        };
        const allWBSItems = flattenWBS(wbsData);
        const hasRootLevel = allWBSItems.some(
          (item: WBSItem) => item.level === 0
        );
        if (hasRootLevel) {
          showError(
            "Root Level Already Exists",
            "A Level 0 (Root) WBS already exists for this project. You can only have one root level. Please select a different level."
          );
          return;
        }
      }
      const payload = {
        project_id: parseInt(projectId),
        name: formData.name,
        description: formData.description,
        level: formData.level,
        start_date: formData.start_date,
        progress_percentage: 0,
        budget_amount: formData.budget_amount,
        ...(formData.parent_wbs_id && {
          parent_wbs_id: formData.parent_wbs_id,
        }),
        ...(formData.progress_weight != null && typeof formData.progress_weight === "number" && {
          progress_weight: formData.progress_weight,
        }),
      };
      const response = await axios.post("/api/wbs", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      // Refresh WBS data and statistics
      await fetchWBSData();
      await fetchStatistics();
      setShowCreateForm(false);
    } catch (error: any) {
      console.error("Error creating WBS item:", error);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Response data:", error.response.data);
        // Handle specific error cases
        if (error.response.status === 400) {
          const errorMessage =
            error.response.data?.message || "Invalid WBS data provided";
          showError("Validation Error", errorMessage);
        } else if (error.response.status === 409) {
          showError(
            "Duplicate Entry",
            "A WBS item with similar properties already exists. Please check your data and try again."
          );
        } else {
          showError(
            "Server Error",
            `Failed to create WBS item: ${
              error.response.data?.message || error.response.statusText
            }`
          );
        }
      } else if (error.request) {
        showError(
          "Network Error",
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      } else {
        showError(
          "Unexpected Error",
          "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setCreating(false);
    }
  };
  const getStatusBadge = (status: string) => {
    return (
      <StatusBadge
        label={status.replace(/_/g, " ")}
        tone={wbsStatusTone(status)}
      />
    );
  };
  const toggleExpand = (wbsId: number) => {
    const updateExpanded = (items: WBSItem[]): WBSItem[] => {
      return items.map((item) => {
        if (item.wbs_id === wbsId) {
          return { ...item, isExpanded: !item.isExpanded };
        }
        if (item.children) {
          return { ...item, children: updateExpanded(item.children) };
        }
        return item;
      });
    };
    setWbsData(updateExpanded(wbsData));
  }; // Export functionality
  // Filter functionality
  const applyFilters = (items: WBSItem[]): WBSItem[] => {
    return items.filter((item) => {
      // Search term filter - apply first if there's a search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.wbs_code.toLowerCase().includes(searchLower);
        // If search term doesn't match, exclude this item
        if (!matchesSearch) {
          return false;
        }
      }
      // Status filter
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      // Level filter
      if (filters.level && item.level !== parseInt(filters.level)) {
        return false;
      }
      // Progress filter
      if (
        filters.progressMin &&
        item.progress_percentage < parseInt(filters.progressMin)
      ) {
        return false;
      }
      if (
        filters.progressMax &&
        item.progress_percentage > parseInt(filters.progressMax)
      ) {
        return false;
      }
      // Budget filter
      if (
        filters.budgetMin &&
        (item.budget_amount || 0) < parseFloat(filters.budgetMin)
      ) {
        return false;
      }
      if (
        filters.budgetMax &&
        (item.budget_amount || 0) > parseFloat(filters.budgetMax)
      ) {
        return false;
      }
      return true;
    });
  };
  const resetFilters = () => {
    setFilters({
      status: "",
      level: "",
      progressMin: "",
      progressMax: "",
      budgetMin: "",
      budgetMax: "",
    });
    setSearchTerm("");
    setShowFilters(false);
  };
  const hasActiveFilters = () => {
    return (
      Object.values(filters).some((value) => value !== "") || searchTerm !== ""
    );
  };
  const showError = (title: string, message: string) => {
    setError({
      show: true,
      title,
      message,
    });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setError((prev) => ({ ...prev, show: false }));
    }, 5000);
  };
  const handleDeleteClick = (item: WBSItem) => {
    setItemToDelete(item);
    setShowDeleteConfirmation(true);
  };
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      // Add cascade parameter if the WBS has children
      const hasChildren =
        itemToDelete.children && itemToDelete.children.length > 0;
      const url = hasChildren
        ? `/api/wbs/${itemToDelete.wbs_id}?cascade=true`
        : `/api/wbs/${itemToDelete.wbs_id}`;
      const response = await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Refresh WBS data and statistics after successful delete
      await refreshWBSAndStats();
      // Close the confirmation dialog
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
      // Show success message
      const deletedCount = response.data.deletedCount || 1;
      console.log(
        `${response.data.message} (${deletedCount} item${
          deletedCount > 1 ? "s" : ""
        })`
      );
    } catch (error: any) {
      console.error("Error deleting WBS item:", error);
      const hasChildren =
        itemToDelete.children && itemToDelete.children.length > 0;
      let errorMessage = "Failed to delete WBS item";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = hasChildren
          ? "Cannot perform cascading delete. Some child items may be protected or in use."
          : "Cannot delete WBS item. It may be in use or have dependencies.";
      } else if (error.response?.status === 404) {
        errorMessage = "WBS item not found";
      } else if (error.response?.status === 500) {
        errorMessage = hasChildren
          ? "Server error occurred while performing cascading delete"
          : "Server error occurred while deleting WBS item";
      }
      showError("Delete Failed", errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };
  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    try {
      setIsDeletingBulk(true);
      const authToken = localStorage.getItem("token");
      if (!authToken) {
        showError("Authentication Required", "Please log in to delete WBS items.");
        return;
      }
      const response = await axios.post(
        "/api/wbs/bulk-delete",
        { wbs_ids: selectedItems },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      // Refresh WBS data and statistics after successful delete
      await refreshWBSAndStats();
      // Clear selection and close dialog
      setSelectedItems([]);
      setShowBulkDeleteConfirm(false);
      // Show success message
      console.log(
        `${response.data.message} (${response.data.deletedCount} items deleted)`
      );
    } catch (error: any) {
      console.error("Error bulk deleting WBS items:", error);
      let errorMessage = "Failed to delete WBS items";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request. Some items may be root level or have dependencies.";
      } else if (error.response?.status === 403) {
        errorMessage = "Insufficient permissions to delete WBS items.";
      } else if (error.response?.status === 404) {
        errorMessage = "Some WBS items were not found.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error occurred while deleting WBS items.";
      }
      showError("Bulk Delete Failed", errorMessage);
    } finally {
      setIsDeletingBulk(false);
    }
  };
  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteConfirm(false);
  }; // Render WBS as a flat list
  const renderWBSList = (items: WBSItem[]) => {
    const flattenWBS = (items: WBSItem[]): WBSItem[] => {
      let result: WBSItem[] = [];
      items.forEach((item) => {
        result.push(item);
        if (item.children) {
          result = result.concat(flattenWBS(item.children));
        }
      });
      return result;
    };
    const allItems = flattenWBS(items);
    const filteredItems = applyFilters(allItems);
    return filteredItems.map((item) => (
      <div key={item.wbs_id} className="mb-1">
        <div
          className={`flex items-center p-3 rounded-lg border border-line hover:bg-surface-2  transition-colors ${
            selectedItems.includes(item.wbs_id)
              ? "bg-info-soft border-info "
              : ""
          }`}
          onClick={() => setSelectedWBS(item)}
        >
          {/* Checkbox for selection (only for non-root items) */}
          {canEditWBS() && item.level > 0 && (
            <input
              type="checkbox"
              checked={selectedItems.includes(item.wbs_id)}
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.checked) {
                  setSelectedItems([...selectedItems, item.wbs_id]);
                } else {
                  setSelectedItems(selectedItems.filter(id => id !== item.wbs_id));
                }
              }}
              className="w-4 h-4 text-info border-line rounded focus:ring-info mr-3"
            />
          )}
          {/* Level Badge */}
          <div className="mr-3">
            <span className="px-2 py-1 bg-info-soft text-info rounded text-xs font-medium">
              L{item.level}
            </span>
          </div>
          {/* WBS Code */}
          <div className="w-20 flex-shrink-0">
            <span className="text-xs font-mono text-muted">
              {item.wbs_code}
            </span>
          </div>
          {/* Name and Description */}
          <div className="flex-1 min-w-0 mx-4">
            <h4 className="text-sm font-medium text-ink truncate">
              {item.name}
            </h4>
            {item.description && (
              <p className="text-xs text-muted truncate">
                {item.description}
              </p>
            )}
          </div>
          {/* Weight (optional) - right after level and name */}
          <div className="w-16 mr-4">
            {item.progress_weight != null && item.progress_weight !== undefined ? (
              <span className="text-xs text-muted" title="Progress weight for rollup">
                W: {item.progress_weight}%
              </span>
            ) : (
              <span className="text-xs text-faint">—</span>
            )}
          </div>
          {/* Budget */}
          <div className="w-32 text-right mr-4">
            <div className="text-sm font-medium text-ink">
              OMR {(item.budget_amount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted">
              Spent: OMR {(item.actual_cost || 0).toLocaleString()}
            </div>
          </div>
          {/* Progress */}
          <div className="w-24 mr-4">
            <div className="text-xs text-muted mb-1">
              {item.progress_percentage}%
            </div>
            <div className="w-full bg-surface-3 rounded-full h-2">
              <div
                className="bg-info h-2 rounded-full transition-all duration-300"
                style={{ width: `${item.progress_percentage}%` }}
              ></div>
            </div>
          </div>
          {/* Status */}
          <div className="w-24 mr-4">{getStatusBadge(item.status)}</div>
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWBS(item);
                setShowDetails(true);
              }}
              className="p-2 text-faint hover:text-info hover:bg-info-soft rounded-lg transition-colors"
            >
              <Eye size={14} />
            </button>
            {canEditWBS() && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem(item.wbs_id);
                }}
                className="p-2 text-faint hover:text-info hover:bg-info-soft rounded-lg transition-colors"
              >
                <Edit size={14} />
              </button>
            )}
            {/* Only show delete button for non-root items (level > 0) and users with edit permissions */}
            {canEditWBS() && item.level > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(item);
                }}
                className="p-2 text-faint hover:text-danger hover:bg-danger-soft rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    ));
  };
  const renderWBSTree = (items: WBSItem[], depth = 0) => {
    // Apply filters to the tree while preserving hierarchy
    const filterTreeItems = (items: WBSItem[]): WBSItem[] => {
      return items
        .filter((item) => {
          // Check if the item itself matches the filters
          const itemMatches = applyFilters([item]).length > 0;
          // Check if any children match (recursive)
          const hasMatchingChildren =
            item.children &&
            item.children.length > 0 &&
            filterTreeItems(item.children).length > 0;
          // Include item if either it matches or has matching children
          return itemMatches || hasMatchingChildren;
        })
        .map((item) => ({
          ...item,
          children: item.children ? filterTreeItems(item.children) : [],
        }));
    };
    const filteredItems = hasActiveFilters() ? filterTreeItems(items) : items;
    return filteredItems.map((item) => (
      <div key={item.wbs_id} className="space-y-2">
        <div
          className={`flex items-center space-x-3 p-3 rounded-lg border border-line hover:bg-surface-2  transition-colors ${
            selectedItems.includes(item.wbs_id)
              ? "bg-info-soft border-info "
              : ""
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/Collapse Button */}
          {item.children && item.children.length > 0 && (
            <button
              onClick={() => toggleExpand(item.wbs_id)}
              className="p-1 hover:bg-surface-3 rounded"
            >
              {item.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted" />
              )}
            </button>
          )}
          {/* Checkbox for selection (only for non-root items) */}
          {canEditWBS() && item.level > 0 && (
            <input
              type="checkbox"
              checked={selectedItems.includes(item.wbs_id)}
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.checked) {
                  setSelectedItems([...selectedItems, item.wbs_id]);
                } else {
                  setSelectedItems(selectedItems.filter(id => id !== item.wbs_id));
                }
              }}
              className="w-4 h-4 text-info border-line rounded focus:ring-info"
            />
          )}
          {/* Level Indicator */}
          <div
            className={`w-3 h-3 rounded-full ${
              item.level === 0
                ? "bg-accent-violet"
                : item.level === 1
                ? "bg-info"
                : item.level === 2
                ? "bg-success"
                : "bg-muted"
            }`}
          />
          {/* WBS Code */}
          <span className="text-sm font-mono text-muted min-w-20">
            {item.wbs_code}
          </span>
          {/* WBS Name and Description */}
          <div className="flex-1">
            <h4 className="font-medium text-ink">
              {item.name}
            </h4>
            {item.description && (
              <p className="text-sm text-muted">
                {item.description}
              </p>
            )}
          </div>
          {/* Weight - right after level and name */}
          <div className="w-14 text-sm text-muted">
            {item.progress_weight != null && item.progress_weight !== undefined ? `W: ${item.progress_weight}%` : "—"}
          </div>
          {/* Progress */}
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-surface-3 rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${item.progress_percentage || 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-muted w-12">
              {item.progress_percentage || 0}%
            </span>
          </div>
          {/* Budget */}
          <div className="text-right">
            <p className="text-sm font-medium text-ink">
              OMR {(item.budget_amount || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted">
              Spent: OMR {(item.actual_cost || 0).toLocaleString()}
            </p>
          </div>
          {/* Status */}
          {getStatusBadge(item.status)}
          {/* Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setSelectedWBS(item);
                setShowDetails(true);
              }}
              className="p-2 hover:bg-surface-3 rounded transition-colors"
            >
              <Eye className="w-4 h-4 text-muted" />
            </button>
            {canEditWBS() && (
              <button
                onClick={() => setEditingItem(item.wbs_id)}
                className="p-2 hover:bg-surface-3 rounded transition-colors"
              >
                <Edit className="w-4 h-4 text-muted" />
              </button>
            )}
            {/* Only show delete button for non-root items (level > 0) and users with edit permissions */}
            {canEditWBS() && item.level > 0 && (
              <button
                onClick={() => handleDeleteClick(item)}
                className="p-2 hover:bg-danger-soft hover:text-danger rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 text-muted hover:text-danger" />
              </button>
            )}
          </div>
        </div>{" "}
        {/* Render children if expanded */}
        {item.isExpanded && item.children && item.children.length > 0 && (
          <div className="space-y-2">
            {renderWBSTree(item.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };
  const renderDetailsPanel = () => {
    if (!selectedWBS) return null;
    return (
      <div className="bg-surface border border-line rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">
            WBS Details
          </h3>
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedWBS(null);
            }}
            className="text-faint hover:text-muted p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                WBS Code
              </label>
              <p className="text-sm text-ink font-mono">
                {selectedWBS.wbs_code}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Name
              </label>
              <p className="text-sm text-ink">
                {selectedWBS.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Level
              </label>
              <p className="text-sm text-ink">
                Level {selectedWBS.level}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Description
            </label>
            <p className="text-sm text-muted">
              {selectedWBS.description || "No description provided"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Budget
              </label>
              <p className="text-sm text-ink">
                OMR {(selectedWBS.budget_amount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Actual Cost
              </label>
              <p className="text-sm text-ink">
                OMR {(selectedWBS.actual_cost || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Start Date
              </label>
              <p className="text-sm text-ink">
                {selectedWBS.start_date
                  ? formatDateSafely(selectedWBS.start_date)
                  : "Not set"
                }
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                End Date
              </label>
              <p className="text-sm text-ink">
                {selectedWBS.end_date
                  ? formatDateSafely(selectedWBS.end_date)
                  : "Will be calculated from tasks"
                }
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Progress
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-surface-3 rounded-full h-2">
                  <div
                    className="bg-success h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${selectedWBS.progress_percentage}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-ink">
                  {selectedWBS.progress_percentage}%
                </span>
              </div>
            </div>
          </div>
          {(selectedWBS.progress_weight != null && selectedWBS.progress_weight !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Progress weight (%)
              </label>
              <p className="text-sm text-ink">
                {selectedWBS.progress_weight}% — used when rolling up to project progress
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-1">
              Status
            </label>
            <div>{getStatusBadge(selectedWBS.status)}</div>
          </div>
        </div>
      </div>
    );
  };
  if (!mounted || loading) {
    return (
      <DashboardLayout
        title="Project WBS"
        onViewChange={setActiveView}
        activeView={activeView}
      >
        <div className="flex items-center justify-center min-h-96">
          <Spinner size={32} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }
  // Add at the top of the component, after hooks
  const handleBackButton = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      if (from === "setup" || from === "previous") {
        router.push(`/projects/${projectId}/setup`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    }
  };
  // Add/Update the Next button handler
  const handleNext = async () => {
    try {
      await axios.patch(
        `/api/projects/${projectId}/setup`,
        { wbs: true },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      router.push(`/projects/${projectId}/schedule?from=previous`);
    } catch (error) {
      // Optionally show error to user
      console.error("Failed to update setup status:", error);
    }
  };
  return (
    <>
      <DashboardLayout
        title=""
        onViewChange={setActiveView}
        activeView={activeView}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackButton}
              className="p-2 rounded-lg text-faint hover:text-muted hover:bg-surface-2 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-ink">
                Work Breakdown Structure
              </h1>
              {project && (
                <p className="text-muted">
                  {project.name} ({project.project_code})
                </p>
              )}
            </div>
          </div>{" "}
          <div className="flex items-center space-x-3">
            {canEditWBS() && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <Upload size={16} />
                <span>Bulk Upload</span>
              </button>
            )}
            {canEditWBS() && (
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={creating}
                className="flex items-center space-x-2 px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Spinner size={16} />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add WBS Item</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        {/* Read-only notification for users without edit permissions */}
        {!canEditWBS() && (
          <div className="bg-info-soft border border-info rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-info mr-2" />
              <span className="text-info">
                You are viewing this WBS in read-only mode. Only Project
                Managers (PJM), PMO, and Administrators can edit WBS items.
              </span>
            </div>
          </div>
        )}
        {/* Project Statistics */}
        {project && statistics && (
          <StatGrid className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Overall Progress"
              value={`${statistics.overall_progress.toFixed(1)}%`}
              icon={<Target className="h-5 w-5" />}
              tone="brand"
            />
            <StatTile
              label="Total Budget"
              value={`OMR ${project.budget_amount.toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
              tone="success"
            />
            <StatTile
              label="Total Spent"
              value={`OMR ${statistics.total_spent.toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5" />}
              tone={
                statistics.budget_utilization > 100
                  ? "danger"
                  : statistics.budget_utilization >= 80
                  ? "warning"
                  : "neutral"
              }
            />
            <StatTile
              label="Budget Utilization"
              value={`${statistics.budget_utilization.toFixed(1)}%`}
              icon={<BarChart3 className="h-5 w-5" />}
              tone={
                statistics.budget_utilization > 100
                  ? "danger"
                  : statistics.budget_utilization >= 80
                  ? "warning"
                  : "success"
              }
            />
            <StatTile
              label="WBS Items"
              value={statistics.wbs_count}
              icon={<Layers className="h-5 w-5" />}
              tone="brand"
            />
          </StatGrid>
        )}
        {/* WBS Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* WBS Tree */}
          <div className="bg-surface rounded-xl shadow-lg p-6">
            {wbsData.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="w-16 h-16 text-faint mx-auto mb-4" />
                <h3 className="text-lg font-medium text-ink mb-2">
                  No WBS Structure Found
                </h3>
                <p className="text-muted mb-6">
                  The WBS structure will be created when the project is set up.
                  If you're not seeing any WBS items, try refreshing the page.
                </p>
                <button
                  onClick={fetchWBSData}
                  disabled={creating}
                  className="flex items-center space-x-2 px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors mx-auto disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  <span>Refresh WBS Data</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  {" "}
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-ink">
                      WBS {viewMode === "tree" ? "Hierarchy" : "List"}
                    </h3>
                    {/* Selection info and bulk actions */}
                    {selectedItems.length > 0 && canEditWBS() && (
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-info">
                          {selectedItems.length} selected
                        </span>
                        <button
                          onClick={() => setSelectedItems([])}
                          className="text-sm text-muted hover:underline"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          className="flex items-center space-x-1 px-3 py-1 bg-danger text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          <span>Delete Selected</span>
                        </button>
                      </div>
                    )}
                    {hasActiveFilters() && (
                      <span className="px-2 py-1 bg-info-soft text-info rounded-full text-xs font-medium">
                        Filtered
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setViewMode(viewMode === "tree" ? "list" : "tree")
                      }
                      className="px-3 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
                    >
                      {viewMode === "tree"
                        ? "Switch to List View"
                        : "Switch to Tree View"}
                    </button>{" "}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-3 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2  transition-colors ${
                        hasActiveFilters()
                          ? "bg-info-soft border-info "
                          : ""
                      }`}
                    >
                      <Filter size={16} />
                    </button>
                  </div>{" "}
                </div>
                {/* Filter Panel */}
                {showFilters && (
                  <div className="bg-surface-2 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-ink">
                        Filter WBS Items
                      </h4>
                      {hasActiveFilters() && (
                        <button
                          onClick={resetFilters}
                          className="text-xs text-info hover:text-info"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Search */}
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Search
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search name, description, or code..."
                          className="w-full px-3 py-2 text-sm border border-line rounded-md bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                        />
                      </div>
                      {/* Status Filter */}
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Status
                        </label>
                        <Dropdown
                          value={String(filters.status ?? '')}
                          onChange={(__v: string) =>
                            setFilters({ ...filters, status: __v })}
                          options={[
                          { value: String(""), label: "All Statuses" },
                          { value: String("not_started"), label: "Not Started" },
                          { value: String("in_progress"), label: "In Progress" },
                          { value: String("completed"), label: "Completed" },
                          { value: String("on_hold"), label: "On Hold" },
                          { value: String("delayed"), label: "Delayed" },
                        ]}
                        />
                      </div>
                      {/* Level Filter */}
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Level
                        </label>
                        <Dropdown
                          value={String(filters.level ?? '')}
                          onChange={(__v: string) =>
                            setFilters({ ...filters, level: __v })}
                          options={[
                          { value: String(""), label: "All Levels" },
                          { value: String("0"), label: "Level 0" },
                          { value: String("1"), label: "Level 1" },
                          { value: String("2"), label: "Level 2" },
                          { value: String("3"), label: "Level 3" },
                          { value: String("4"), label: "Level 4" },
                        ]}
                        />
                      </div>
                      {/* Progress Range */}
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Progress Min %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={filters.progressMin}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              progressMin: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm border border-line rounded-md bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Progress Max %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={filters.progressMax}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              progressMax: e.target.value,
                            })
                          }
                          placeholder="100"
                          className="w-full px-3 py-2 text-sm border border-line rounded-md bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                        />
                      </div>
                      {/* Budget Range */}
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Budget Min (OMR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={filters.budgetMin}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              budgetMin: e.target.value,
                            })
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 text-sm border border-line rounded-md bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-3 mb-1">
                          Budget Max (OMR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={filters.budgetMax}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              budgetMax: e.target.value,
                            })
                          }
                          placeholder="100000"
                          className="w-full px-3 py-2 text-sm border border-line rounded-md bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {viewMode === "tree"
                    ? renderWBSTree(wbsData)
                    : renderWBSList(wbsData)}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* WBS Details Modal */}
        {mounted &&
          showDetails &&
          selectedWBS &&
          createPortal(
            <div
              className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              onClick={() => {
                setShowDetails(false);
                setSelectedWBS(null);
              }}
            >
              <div
                className="bg-surface rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {renderDetailsPanel()}
              </div>
            </div>,
            document.body
          )}
        {/* Next Step Button */}
        {wbsData.length > 0 && showNavButtons && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={() =>
                router.push(`/projects/${projectId}/setup?from=previous`)
              }
              className="flex items-center space-x-2 px-6 py-3 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Setup</span>
            </button>
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <span>Next: Create Schedule</span>
              <Calendar size={16} />
            </button>
          </div>
        )}
      </DashboardLayout>
      {/* Edit WBS Modal using Portal */}
      {mounted &&
        editingItem &&
        createPortal(
          <div
            className="fixed inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setMouseDownOnBackdrop(true);
              } else {
                setMouseDownOnBackdrop(false);
              }
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop) {
                setEditingItem(null);
              }
              setMouseDownOnBackdrop(false);
            }}
          >
            <div className="bg-surface rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <EditWBSForm
                wbsItem={findWBSItemById(wbsData, editingItem)}
                onClose={() => setEditingItem(null)}
                onSave={refreshWBSAndStats}
              />
            </div>
          </div>,
          document.body
        )}
      {/* Create Single WBS Modal */}
      {mounted &&
        showCreateForm &&
        createPortal(
          <div
            className="fixed inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setMouseDownOnBackdrop(true);
              } else {
                setMouseDownOnBackdrop(false);
              }
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop) {
                setShowCreateForm(false);
              }
              setMouseDownOnBackdrop(false);
            }}
          >
            <div className="bg-surface rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CreateWBSForm
                onClose={() => setShowCreateForm(false)}
                onSave={createSingleWBS}
                project={project}
                creating={creating}
                wbsData={wbsData}
              />
            </div>
          </div>,
          document.body
        )}
      {/* Delete Confirmation Modal */}
      {mounted &&
        showDeleteConfirmation &&
        itemToDelete &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[9999]"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={handleDeleteCancel}
          >
            <div
              className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor:
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "rgba(30, 41, 59, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border:
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "1px solid rgba(148, 163, 184, 0.2)"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-danger-soft rounded-full flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6 text-danger" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Delete WBS Item
                  </h3>
                  <p className="text-sm text-muted">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className="text-ink-3 mb-6">
                <p className="mb-3">
                  Are you sure you want to delete{" "}
                  <strong>"{itemToDelete.name}"</strong> (
                  {itemToDelete.wbs_code})?
                </p>
                {itemToDelete.children && itemToDelete.children.length > 0 && (
                  <div className="bg-danger-soft border border-danger rounded-lg p-3 mt-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-danger font-medium text-sm">
                          Cascading Delete Warning
                        </p>
                        <p className="text-danger text-sm mt-1">
                          This WBS item has{" "}
                          <strong>
                            {itemToDelete.children.length} child item(s)
                          </strong>
                          . Deleting this item will also permanently delete all
                          of its children and their associated data.
                        </p>
                        <p className="text-danger text-xs mt-2 font-medium">
                          This action cannot be undone!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDeleting && (
                    <Spinner size={16} />
                  )}
                  <span>
                    {isDeleting
                      ? "Deleting..."
                      : itemToDelete.children &&
                        itemToDelete.children.length > 0
                      ? "Delete WBS & Children"
                      : "Delete WBS Item"}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* Bulk Delete Confirmation Modal */}
      {mounted &&
        showBulkDeleteConfirm &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center z-[9999]"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={handleBulkDeleteCancel}
          >
            <div
              className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
              style={{
                backgroundColor:
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "rgba(30, 41, 59, 0.95)"
                    : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border:
                  typeof window !== "undefined" &&
                  document.documentElement.classList.contains("dark")
                    ? "1px solid rgba(148, 163, 184, 0.2)"
                    : "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-danger-soft rounded-full flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6 text-danger" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Delete Multiple WBS Items
                  </h3>
                  <p className="text-sm text-muted">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className="text-ink-3 mb-6">
                <p className="mb-3">
                  Are you sure you want to delete{" "}
                  <strong>{selectedItems.length} WBS item(s)</strong>?
                </p>
                <div className="bg-danger-soft border border-danger rounded-lg p-3 mt-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-danger font-medium text-sm">
                        Cascading Delete Warning
                      </p>
                      <p className="text-danger text-sm mt-1">
                        Deleting these WBS items will also permanently delete all
                        of their children and associated data (tasks, budgets, procurements, etc.).
                      </p>
                      <p className="text-danger text-xs mt-2 font-medium">
                        This action cannot be undone!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleBulkDeleteCancel}
                  disabled={isDeletingBulk}
                  className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDeletingBulk && (
                    <Spinner size={16} />
                  )}
                  <span>
                    {isDeletingBulk
                      ? "Deleting..."
                      : `Delete ${selectedItems.length} Item(s)`}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* Error Notification */}
      {error.show && (
        <div className="fixed top-4 right-4 z-[10000] max-w-md">
          <div className="bg-danger-soft border border-danger rounded-lg shadow-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-danger">
                  {error.title}
                </h3>
                <p className="mt-1 text-sm text-danger">{error.message}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setError((prev) => ({ ...prev, show: false }))}
                  className="inline-flex text-danger hover:text-danger focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <ArrowLeft className="h-4 w-4 rotate-45" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* WBS Template Manager Modal */}
      {mounted &&
        showTemplateModal &&
        createPortal(
          <div className="fixed inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <div className="bg-surface rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-ink">
                    WBS Template Manager
                  </h3>
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>
                <WBSTemplateManager
                  projectId={parseInt(projectId)}
                  onWBSCreated={async () => {
                    await refreshWBSAndStats();
                    setShowTemplateModal(false);
                  }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
// Edit WBS Form Component
const EditWBSForm = ({
  wbsItem,
  onClose,
  onSave,
}: {
  wbsItem: WBSItem | undefined;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: wbsItem?.name || "",
    description: wbsItem?.description || "",
    start_date: wbsItem?.start_date
      ? new Date(wbsItem.start_date).toISOString().split("T")[0]
      : "",
    end_date: wbsItem?.end_date
      ? (wbsItem.end_date ? new Date(wbsItem.end_date).toISOString().split("T")[0] : "")
      : "",
    budget_amount: wbsItem?.budget_amount || 0,
    progress_percentage: wbsItem?.progress_percentage || 0,
    progress_weight: (wbsItem?.progress_weight != null && wbsItem.progress_weight !== undefined) ? wbsItem.progress_weight : "",
    status: wbsItem?.status || "not_started",
  });
  const [saving, setSaving] = useState(false);
  // Error popup state
  const [errorPopup, setErrorPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });
  // Function to show error popup
  const showErrorPopup = (title: string, message: string) => {
    setErrorPopup({
      show: true,
      title,
      message,
    });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setErrorPopup((prev) => ({ ...prev, show: false }));
    }, 5000);
  };
  // Check if this WBS item has children (is a parent)
  const hasChildren = wbsItem?.children && wbsItem.children.length > 0;
  const isRoot = wbsItem?.level === 0;
  if (!wbsItem) {
    return (
      <div className="p-6">
        <p className="text-danger">WBS item not found</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-muted text-white rounded"
        >
          Close
        </button>
      </div>
    );
  }
  const handleSave = async () => {
    try {
      setSaving(true);
      // Validate dates: start date cannot be later than end date
      if (formData.start_date && formData.end_date) {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (start > end) {
          showErrorPopup(
            "Invalid Dates",
            "Start date cannot be later than end date"
          );
          setSaving(false);
          return;
        }
      }
      const payload: any = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget_amount: parseFloat(formData.budget_amount.toString()),
      };
      if (!hasChildren) {
        payload.progress_percentage = parseFloat(
          formData.progress_percentage.toString()
        );
      }
      if (formData.progress_weight !== "" && formData.progress_weight != null) {
        payload.progress_weight = parseFloat(formData.progress_weight.toString());
      } else {
        payload.progress_weight = null;
      }
      const response = await axios.put(`/api/wbs/${wbsItem.wbs_id}`, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      onSave(); // Refresh the WBS data
      onClose(); // Close the modal
    } catch (error: any) {
      if (error.response) {
        // Extract the actual error message from the API response
        // API returns error in error.response.data.error or error.response.data.message
        const errorMessage = 
          error.response.data?.error || 
          error.response.data?.message || 
          error.response.statusText || 
          'Unknown error';
        // Show a clear, user-friendly error message
        showErrorPopup(
          "Update Failed",
          errorMessage
        );
      } else if (error.request) {
        showErrorPopup(
          "Network Error",
          "Failed to update WBS item: No response from server"
        );
      } else {
        showErrorPopup("Error", `Failed to update WBS item: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-ink">
            Edit WBS Item
          </h3>
          <p className="text-muted">{wbsItem.wbs_code}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-surface-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      {/* Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Status
            </label>
            <Dropdown
              value={String(formData.status ?? '')}
              onChange={(__v: string) => {
    const newStatus = __v;
    setFormData((prev) => ({
      ...prev,
      status: newStatus,
      // If status is completed, set progress to 100
      progress_percentage:
        !hasChildren && newStatus === "completed"
          ? 100
          : prev.progress_percentage,
    }));
  }}
              options={[
              { value: String("not_started"), label: "Not Started" },
              { value: String("in_progress"), label: "In Progress" },
              { value: String("completed"), label: "Completed" },
              { value: String("on_hold"), label: "On Hold" },
              { value: String("delayed"), label: "Delayed" },
            ]}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-3 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value,
              })
            }
            rows={3}
            className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  start_date: e.target.value,
                })
              }
              className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
              required
            />
          </div>
          {/* Show that end date will be calculated */}
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              End Date
            </label>
            <div className="px-3 py-3 border border-line rounded-lg bg-surface-2 text-muted">
              Will be calculated from tasks
            </div>
            <p className="mt-1 text-xs text-muted">
              End date will be automatically calculated when tasks are added to this WBS
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Budget Amount (OMR)
            </label>
            <input
              type="number"
              value={formData.budget_amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  budget_amount: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
              min="0"
              step="0.01"
            />
            {isRoot && (
              <p className="text-xs text-bright mt-1">
                ⚠️ Warning: This is a root level WBS. Changing the budget will
                affect the entire project structure.
              </p>
            )}
            {hasChildren && (
              <p className="text-xs text-info mt-1">
                💡 Note: This WBS has children. Ensure the budget accommodates
                all child WBS items.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-3 mb-2">
              Progress (%)
              {hasChildren && (
                <span className="text-xs text-info ml-2">
                  (Auto-calculated from children)
                </span>
              )}
            </label>
            <input
              type="number"
              value={formData.progress_percentage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  progress_percentage: parseFloat(e.target.value) || 0,
                })
              }
              disabled={hasChildren}
              className={`w-full p-3 border border-line rounded-lg text-ink focus:ring-2 focus:ring-info focus:border-transparent ${
                hasChildren
                  ? "bg-surface-2  text-muted cursor-not-allowed"
                  : "bg-surface "
              }`}
              min="0"
              max="100"
              step="0.1"
            />
            {hasChildren && (
              <p className="text-xs text-muted mt-1">
                Progress is automatically calculated as the average of all child
                WBS items
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-3 mb-2">
            Progress weight (%)
            <span className="text-xs text-muted ml-2">Optional</span>
          </label>
          <input
            type="number"
            value={formData.progress_weight === "" ? "" : formData.progress_weight}
            onChange={(e) => {
              const v = e.target.value;
              setFormData({
                ...formData,
                progress_weight: v === "" ? "" : parseFloat(v) || 0,
              });
            }}
            placeholder="Leave empty for equal weight"
            className="w-full p-3 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-muted mt-1">
            Weight (0–100) used when rolling up this WBS to project progress. Empty = equal share with siblings.
          </p>
        </div>
      </div>
      {/* Footer */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-line">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={
            saving ||
            !formData.name ||
            !formData.start_date ||
            !formData.end_date
          }
          className="flex items-center space-x-2 px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Spinner size={16} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
      {/* Error Popup */}
      {errorPopup.show && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div
            className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{
              animation: "fadeIn 0.3s ease-out",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-danger-soft rounded-full flex items-center justify-center mr-4">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  {errorPopup.title}
                </h3>
                <p className="text-sm text-muted">
                  Please correct and try again
                </p>
              </div>
              <button
                onClick={() =>
                  setErrorPopup((prev) => ({ ...prev, show: false }))
                }
                className="ml-auto p-2 text-faint hover:text-muted rounded-full hover:bg-surface-2"
              >
                <ArrowLeft className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <p className="text-ink-3 mb-4">
              {errorPopup.message}
            </p>
            <button
              onClick={() =>
                setErrorPopup((prev) => ({ ...prev, show: false }))
              }
              className="w-full py-2 bg-danger hover:opacity-90 text-white rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectWBSPage;
