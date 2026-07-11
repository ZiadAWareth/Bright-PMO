"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

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
  Download,
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
  const [exporting, setExporting] = useState(false);
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
    const statusConfig = {
      not_started: {
        bg: "bg-gray-100 dark:bg-gray-700",
        text: "text-gray-700 dark:text-gray-300",
        label: "Not Started",
      },
      in_progress: {
        bg: "bg-blue-100 dark:bg-blue-900",
        text: "text-blue-700 dark:text-blue-300",
        label: "In Progress",
      },
      completed: {
        bg: "bg-green-100 dark:bg-green-900",
        text: "text-green-700 dark:text-green-300",
        label: "Completed",
      },
      on_hold: {
        bg: "bg-yellow-100 dark:bg-yellow-900",
        text: "text-yellow-700 dark:text-yellow-300",
        label: "On Hold",
      },
      delayed: {
        bg: "bg-red-100 dark:bg-red-900",
        text: "text-red-700 dark:text-red-300",
        label: "Delayed",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.not_started;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
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
  const exportToCSV = async () => {
    try {
      setExporting(true);

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

      const allItems = flattenWBS(wbsData);
      const filteredItems = hasActiveFilters()
        ? applyFilters(allItems)
        : allItems;
      const headers = [
        "WBS Code",
        "Name",
        "Level",
        "Weight (%)",
        "Description",
        "Status",
        "Progress (%)",
        "Budget (OMR)",
        "Actual Cost (OMR)",
        "Start Date",
        "End Date",
      ];
      const csvContent = [
        headers.join(","),
        ...filteredItems.map((item) =>
          [
            `"${item.wbs_code}"`,
            `"${item.name}"`,
            item.level,
            item.progress_weight != null && item.progress_weight !== undefined ? item.progress_weight : "",
            `"${item.description || ""}"`,
            `"${item.status}"`,
            item.progress_percentage,
            item.budget_amount || 0,
            item.actual_cost || 0,
            `"${(item.start_date || "").toString().split("T")[0]}"`,
            `"${(item.end_date || "").toString().split("T")[0]}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `WBS_${project?.project_code || projectId}_${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting WBS data:", error);
      showError(
        "Export Failed",
        "Failed to export WBS data. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }; // Filter functionality
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
          className={`flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            selectedItems.includes(item.wbs_id)
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
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
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 mr-3"
            />
          )}

          {/* Level Badge */}
          <div className="mr-3">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
              L{item.level}
            </span>
          </div>

          {/* WBS Code */}
          <div className="w-20 flex-shrink-0">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {item.wbs_code}
            </span>
          </div>

          {/* Name and Description */}
          <div className="flex-1 min-w-0 mx-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.name}
            </h4>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.description}
              </p>
            )}
          </div>

          {/* Weight (optional) - right after level and name */}
          <div className="w-16 mr-4">
            {item.progress_weight != null && item.progress_weight !== undefined ? (
              <span className="text-xs text-gray-600 dark:text-gray-300" title="Progress weight for rollup">
                W: {item.progress_weight}%
              </span>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
            )}
          </div>

          {/* Budget */}
          <div className="w-32 text-right mr-4">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              OMR {(item.budget_amount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Spent: OMR {(item.actual_cost || 0).toLocaleString()}
            </div>
          </div>

          {/* Progress */}
          <div className="w-24 mr-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {item.progress_percentage}%
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <Eye size={14} />
            </button>
            {canEditWBS() && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem(item.wbs_id);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
          className={`flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            selectedItems.includes(item.wbs_id)
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
              : ""
          }`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/Collapse Button */}
          {item.children && item.children.length > 0 && (
            <button
              onClick={() => toggleExpand(item.wbs_id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              {item.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
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
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
          )}

          {/* Level Indicator */}
          <div
            className={`w-3 h-3 rounded-full ${
              item.level === 0
                ? "bg-purple-500"
                : item.level === 1
                ? "bg-blue-500"
                : item.level === 2
                ? "bg-green-500"
                : "bg-gray-500"
            }`}
          />

          {/* WBS Code */}
          <span className="text-sm font-mono text-gray-500 dark:text-gray-400 min-w-20">
            {item.wbs_code}
          </span>

          {/* WBS Name and Description */}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {item.name}
            </h4>
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {item.description}
              </p>
            )}
          </div>

          {/* Weight - right after level and name */}
          <div className="w-14 text-sm text-gray-600 dark:text-gray-400">
            {item.progress_weight != null && item.progress_weight !== undefined ? `W: ${item.progress_weight}%` : "—"}
          </div>

          {/* Progress */}
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${item.progress_percentage || 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
              {item.progress_percentage || 0}%
            </span>
          </div>

          {/* Budget */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              OMR {(item.budget_amount || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <Eye className="w-4 h-4 text-gray-500" />
            </button>
            {canEditWBS() && (
              <button
                onClick={() => setEditingItem(item.wbs_id)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                <Edit className="w-4 h-4 text-gray-500" />
              </button>
            )}
            {/* Only show delete button for non-root items (level > 0) and users with edit permissions */}
            {canEditWBS() && item.level > 0 && (
              <button
                onClick={() => handleDeleteClick(item)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            WBS Details
          </h3>
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedWBS(null);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                WBS Code
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                {selectedWBS.wbs_code}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {selectedWBS.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Level
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                Level {selectedWBS.level}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedWBS.description || "No description provided"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                OMR {(selectedWBS.budget_amount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Actual Cost
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                OMR {(selectedWBS.actual_cost || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {selectedWBS.start_date
                  ? formatDateSafely(selectedWBS.start_date)
                  : "Not set"
                }
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {selectedWBS.end_date
                  ? formatDateSafely(selectedWBS.end_date)
                  : "Will be calculated from tasks"
                }
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Progress
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${selectedWBS.progress_percentage}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedWBS.progress_percentage}%
                </span>
              </div>
            </div>
          </div>

          {(selectedWBS.progress_weight != null && selectedWBS.progress_weight !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress weight (%)
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {selectedWBS.progress_weight}% — used when rolling up to project progress
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Work Breakdown Structure
              </h1>
              {project && (
                <p className="text-gray-600 dark:text-gray-400">
                  {project.name} ({project.project_code})
                </p>
              )}
            </div>
          </div>{" "}
          <div className="flex items-center space-x-3">
            {canEditWBS() && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Upload size={16} />
                <span>Bulk Upload</span>
              </button>
            )}

            <button
              onClick={exportToCSV}
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Export</span>
                </>
              )}
            </button>

            {canEditWBS() && (
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={creating}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-blue-800 dark:text-blue-200">
                You are viewing this WBS in read-only mode. Only Project
                Managers (PJM), PMO, and Administrators can edit WBS items.
              </span>
            </div>
          </div>
        )}

        {/* Project Statistics */}
        {project && statistics && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Overall Progress
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {statistics.overall_progress.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Budget
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    OMR {project.budget_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Spent
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    OMR {statistics.total_spent.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Budget Utilization
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {statistics.budget_utilization.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Layers className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    WBS Items
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {statistics.wbs_count}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WBS Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* WBS Tree */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {wbsData.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No WBS Structure Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  The WBS structure will be created when the project is set up.
                  If you're not seeing any WBS items, try refreshing the page.
                </p>
                <button
                  onClick={fetchWBSData}
                  disabled={creating}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto disabled:opacity-50"
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      WBS {viewMode === "tree" ? "Hierarchy" : "List"}
                    </h3>
                    
                    {/* Selection info and bulk actions */}
                    {selectedItems.length > 0 && canEditWBS() && (
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {selectedItems.length} selected
                        </span>
                        <button
                          onClick={() => setSelectedItems([])}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowBulkDeleteConfirm(true)}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          <span>Delete Selected</span>
                        </button>
                      </div>
                    )}
                    
                    {hasActiveFilters() && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                        Filtered
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setViewMode(viewMode === "tree" ? "list" : "tree")
                      }
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {viewMode === "tree"
                        ? "Switch to List View"
                        : "Switch to Tree View"}
                    </button>{" "}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        hasActiveFilters()
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                          : ""
                      }`}
                    >
                      <Filter size={16} />
                    </button>
                  </div>{" "}
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Filter WBS Items
                      </h4>
                      {hasActiveFilters() && (
                        <button
                          onClick={resetFilters}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Search */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Search
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search name, description, or code..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            setFilters({ ...filters, status: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Statuses</option>
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="on_hold">On Hold</option>
                          <option value="delayed">Delayed</option>
                        </select>
                      </div>

                      {/* Level Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Level
                        </label>
                        <select
                          value={filters.level}
                          onChange={(e) =>
                            setFilters({ ...filters, level: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Levels</option>
                          <option value="0">Level 0</option>
                          <option value="1">Level 1</option>
                          <option value="2">Level 2</option>
                          <option value="3">Level 3</option>
                          <option value="4">Level 4</option>
                        </select>
                      </div>

                      {/* Progress Range */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Budget Range */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
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
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Setup</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Delete WBS Item
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className="text-gray-700 dark:text-gray-300 mb-6">
                <p className="mb-3">
                  Are you sure you want to delete{" "}
                  <strong>"{itemToDelete.name}"</strong> (
                  {itemToDelete.wbs_code})?
                </p>
                {itemToDelete.children && itemToDelete.children.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 dark:text-red-200 font-medium text-sm">
                          Cascading Delete Warning
                        </p>
                        <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                          This WBS item has{" "}
                          <strong>
                            {itemToDelete.children.length} child item(s)
                          </strong>
                          . Deleting this item will also permanently delete all
                          of its children and their associated data.
                        </p>
                        <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-medium">
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
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDeleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Delete Multiple WBS Items
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className="text-gray-700 dark:text-gray-300 mb-6">
                <p className="mb-3">
                  Are you sure you want to delete{" "}
                  <strong>{selectedItems.length} WBS item(s)</strong>?
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mt-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 dark:text-red-200 font-medium text-sm">
                        Cascading Delete Warning
                      </p>
                      <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                        Deleting these WBS items will also permanently delete all
                        of their children and associated data (tasks, budgets, procurements, etc.).
                      </p>
                      <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-medium">
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
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isDeletingBulk && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {error.title}
                </h3>
                <p className="mt-1 text-sm text-red-700">{error.message}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setError((prev) => ({ ...prev, show: false }))}
                  className="inline-flex text-red-400 hover:text-red-600 focus:outline-none"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    WBS Template Manager
                  </h3>
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
        <p className="text-red-600">WBS item not found</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Edit WBS Item
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{wbsItem.wbs_code}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
  value={formData.status}
  onChange={(e) => {
    const newStatus = e.target.value;
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
  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
>
  <option value="not_started">Not Started</option>
  <option value="in_progress">In Progress</option>
  <option value="completed">Completed</option>
  <option value="on_hold">On Hold</option>
  <option value="delayed">Delayed</option>
</select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Show that end date will be calculated */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <div className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              Will be calculated from tasks
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              End date will be automatically calculated when tasks are added to this WBS
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
            {isRoot && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                ⚠️ Warning: This is a root level WBS. Changing the budget will
                affect the entire project structure.
              </p>
            )}
            {hasChildren && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                💡 Note: This WBS has children. Ensure the budget accommodates
                all child WBS items.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Progress (%)
              {hasChildren && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
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
              className={`w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                hasChildren
                  ? "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-white dark:bg-gray-700"
              }`}
              min="0"
              max="100"
              step="0.1"
            />
            {hasChildren && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Progress is automatically calculated as the average of all child
                WBS items
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Progress weight (%)
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">Optional</span>
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            max="100"
            step="0.1"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Weight (0–100) used when rolling up this WBS to project progress. Empty = equal share with siblings.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{
              animation: "fadeIn 0.3s ease-out",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {errorPopup.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please correct and try again
                </p>
              </div>
              <button
                onClick={() =>
                  setErrorPopup((prev) => ({ ...prev, show: false }))
                }
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {errorPopup.message}
            </p>
            <button
              onClick={() =>
                setErrorPopup((prev) => ({ ...prev, show: false }))
              }
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
