"use client";

import React, { useState, useEffect, useRef } from "react";

import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  DollarSign,
  Calendar,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Save,
  X,
  CheckSquare,
  Upload,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { ProjectSetup } from "@/types/project";
import { Spinner } from "@/components/ui/spinner";
import { StatCard, StatusBadge } from "@/components/ui/form-shell";

interface Budget {
  budget_id: number;
  project_id: number;
  wbs_id?: number;
  task_id?: number;
  cost_type: string;
  planned_amount: number;
  actual_amount: number;
  variance: number;
  threshold?: number;
  fiscal_year?: number;
  fiscal_period?: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  task_id: number;
  name: string;
  description: string | null;
  wbs_id: number;
  start_date: string;
  end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  duration: number;
  progress_percentage: number;
  is_milestone: boolean;
  is_critical_path: boolean;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "completed" | "on_hold";
  created_at: string;
  updated_at: string;
  estimated_hours: number;
  actual_hours: number;
  work_package: string | null;
}

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
  status: string;
  created_at: string;
  updated_at: string;
  children?: WBSItem[];
  budgets?: Budget[];
  tasks?: Task[];
  isExpanded?: boolean;
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

interface User {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: {
    role_id: number;
    name: string;
  };
}

const ProjectBudgetPage = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [wbsData, setWbsData] = useState<WBSItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [activeView, setActiveView] = useState("admin");
  const [editingWBS, setEditingWBS] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const [setup, setSetup] = useState<ProjectSetup | null>(null);

  // Check if user has permission to edit budget
  const canEditBudget = () => {
    if (!user || !user.role) {
      console.log("User role is not defined as  role is: ", user?.role);
      return false;
    }
    const allowedRoles = ["PMO", "PJM", "ADMIN"];
    return allowedRoles.includes(user.role.name);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      setShowNavButtons(from === "setup" || from === "previous");
    }
  }, []);

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [error]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchProjectData(),
        fetchWBSData(),
        fetchBudgets(),
        fetchSetupStatus(),
        fetchUserData()
      ]);
      setLoading(false);
    };
    loadData();
  }, [projectId]);

  const fetchUserData = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setUser(null);
        return;
      }

      const response = await axios.get(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data.user);
      console.log("User data fetched successfully:", response.data.user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUser(null);
    }
  };

  const fetchProjectData = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await axios.get(
        `/api/projects/${projectId}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setProject(response.data);
      console.log(response.data);
    } catch (error) {
      setProject(null);
    }
  };

  const fetchWBSData = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;

      // Same approach as schedule page: two parallel calls instead of 1 + N
      const [wbsResponse, tasksResponse] = await Promise.all([
        axios.get(`/api/projects/${projectId}/wbs`, auth),
        axios.get(`/api/projects/${projectId}/tasks`, auth),
      ]);

      const wbsList = wbsResponse.data;
      const allTasks: Task[] = tasksResponse.data ?? [];

      // Attach tasks to each WBS by wbs_id (client-side grouping)
      const wbsWithTasks = wbsList.map((wbs: any) => ({
        ...wbs,
        tasks: allTasks.filter(
          (t: Task) => (t.wbs_id ?? (t as any).wbs?.wbs_id) === wbs.wbs_id
        ),
      }));

      // Build hierarchy from flat WBS data
      const buildHierarchy = (items: WBSItem[]): WBSItem[] => {
        const itemMap = new Map<number, WBSItem>();
        const roots: WBSItem[] = [];

        // Create a map of all items
        items.forEach((item) => {
          itemMap.set(item.wbs_id, { ...item, children: [], isExpanded: true });
        });

        // Build the tree structure
        items.forEach((item) => {
          const node = itemMap.get(item.wbs_id)!;
          if (item.parent_wbs_id === null) {
            roots.push(node);
          } else {
            const parent = itemMap.get(item.parent_wbs_id);
            if (parent) {
              parent.children!.push(node);
            }
          }
        });

        return roots;
      };

      const hierarchicalWBS = buildHierarchy(wbsWithTasks);
      setWbsData(hierarchicalWBS);
    } catch (error) {
      console.error("Error fetching WBS data:", error);
      setError("Failed to fetch WBS data");
    }
  };

  const fetchBudgets = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await axios.get(
        `/api/projects/${projectId}/budgets`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setBudgets(res.data);
      console.log(res.data);
    } catch (e) {
      setError("Failed to fetch budgets");
    }
  };

  const fetchSetupStatus = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await axios.get(
        `/api/projects/${projectId}/setup`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setSetup(response.data);
    } catch (error) {
      setSetup(null);
    }
  };

  // Refresh function for template manager
  const refreshBudgetData = async () => {
    await fetchBudgets();
    await fetchWBSData();
  };

  // Calculate budget totals for a WBS item (only its own budget, not children)
  const calculateWBSBudget = (
    wbsItem: WBSItem
  ): { planned: number; actual: number; variance: number } => {
    // For root level WBS (level 0), use the project budget
    if (wbsItem.level === 0 && project) {
      const projectBudget = budgets.find(
        (b) => !b.wbs_id && !b.task_id && b.project_id === project.project_id
      );
      const planned = projectBudget?.planned_amount || project.budget_amount;
      const actual = projectBudget?.actual_amount || 0;
      const variance = planned - actual;
      return { planned, actual, variance };
    }

    // For non-root WBS items, calculate normally
    const wbsBudgets = budgets.filter((b) => b.wbs_id === wbsItem.wbs_id);
    const planned = wbsBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
    const actual = wbsBudgets.reduce((sum, b) => sum + b.actual_amount, 0);
    const variance = wbsBudgets.reduce((sum, b) => sum + b.variance, 0);

    return { planned, actual, variance };
  };

  // Calculate budget totals for a task
  const calculateTaskBudget = (
    task: Task
  ): { planned: number; actual: number; variance: number } => {
    const taskBudgets = budgets.filter((b) => b.task_id === task.task_id);
    const planned = taskBudgets.reduce((sum, b) => sum + b.planned_amount, 0);
    const actual = taskBudgets.reduce((sum, b) => sum + b.actual_amount, 0);
    const variance = taskBudgets.reduce((sum, b) => sum + b.variance, 0);

    return { planned, actual, variance };
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
  };

  const startEditing = (wbsId: number, currentValue: number) => {
    // Check if user has permission to edit
    if (!canEditBudget()) {
      toast.error("Access Denied", {
        description:
          "You don't have permission to edit budgets. Only PMO, PJM, or ADMIN users can modify budget data.",
      });
      return;
    }

    // Find the WBS item to check if it's a root level WBS
    const wbsItem =
      wbsData.find((wbs) => wbs.wbs_id === wbsId) ||
      wbsData
        .flatMap((wbs) => wbs.children || [])
        .find((wbs) => wbs.wbs_id === wbsId);

    // Don't allow editing if it's a root level WBS (level 0)
    if (wbsItem && wbsItem.level === 0) {
      toast.info("Project Budget Lock", {
        description:
          "Root WBS budget is synchronized with project budget and cannot be edited directly.",
      });
      return;
    }

    setEditingWBS(wbsId);
    setEditingTask(null);
    setEditValue(currentValue.toString());
  };

  const startTaskEditing = (taskId: number, currentValue: number) => {
    // Check if user has permission to edit
    if (!canEditBudget()) {
      toast.error("Access Denied", {
        description:
          "You don't have permission to edit budgets. Only PMO, PJM, or ADMIN users can modify budget data.",
      });
      return;
    }

    setEditingTask(taskId);
    setEditingWBS(null);
    setEditValue(currentValue.toString());
  };

  const cancelEditing = () => {
    setEditingWBS(null);
    setEditingTask(null);
    setEditValue("");
  };

  const saveBudget = async (wbsId: number) => {
    // Find the WBS item to check if it's a root level WBS
    const wbsItem =
      wbsData.find((wbs) => wbs.wbs_id === wbsId) ||
      wbsData
        .flatMap((wbs) => wbs.children || [])
        .find((wbs) => wbs.wbs_id === wbsId);

    // Don't allow saving if it's a root level WBS (level 0)
    if (wbsItem && wbsItem.level === 0) {
      toast.error("Cannot Edit Project Budget", {
        description:
          "Root WBS budget is synchronized with project budget and cannot be edited directly.",
      });
      setEditingWBS(null);
      setEditValue("");
      return;
    }

    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      toast.error("Invalid Input", {
        description: "Please enter a valid positive number.",
      });
      return;
    }

    const originalBudgets = [...budgets];
    const existingBudget = originalBudgets.find((b) => b.wbs_id === wbsId);
    let optimisticBudgets;
    const tempId = Date.now(); // Temporary ID for new items

    // Optimistically update UI
    if (existingBudget) {
      optimisticBudgets = originalBudgets.map((b) =>
        b.budget_id === existingBudget.budget_id
          ? {
              ...b,
              planned_amount: newValue,
              variance: newValue - b.actual_amount,
            }
          : b
      );
    } else {
      const newBudgetItem: Budget = {
        budget_id: tempId,
        project_id: parseInt(projectId),
        wbs_id: wbsId,
        task_id: undefined,
        cost_type: "General",
        planned_amount: newValue,
        actual_amount: 0,
        variance: newValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      optimisticBudgets = [...originalBudgets, newBudgetItem];
    }

    setBudgets(optimisticBudgets);
    setEditingWBS(null);
    setEditValue("");

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (existingBudget) {
        // Update existing budget on the server
        await axios.put(
          `/api/budget/${existingBudget.budget_id}`,
          {
            ...existingBudget,
            planned_amount: newValue,
            variance: newValue - existingBudget.actual_amount,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new budget on the server
        const response = await axios.post(
          `/api/projects/${projectId}/budgets`,
          {
            wbs_id: wbsId,
            cost_type: "General",
            planned_amount: newValue,
            actual_amount: 0,
            variance: newValue,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Replace temporary budget with the real one from the server
        const realNewBudget = response.data;
        setBudgets((currentBudgets) =>
          currentBudgets.map((b) =>
            b.budget_id === tempId ? realNewBudget : b
          )
        );
      }

      toast.success("Budget Saved", {
        description: "The planned amount has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving budget:", error);

      // Revert UI on failure
      setBudgets(originalBudgets);

      if (
        error.response?.status === 400 &&
        error.response?.data?.error === "Budget validation failed"
      ) {
        // Display the actual error message from the API
        const errorMessage = 
          error.response?.data?.details || 
          error.response?.data?.error || 
          "The total exceeds the budget limit.";
        toast.error("Budget Validation Failed", {
          description: errorMessage,
        });
      } else {
        // Extract error message from response if available
        const errorMessage = 
          error.response?.data?.error || 
          error.response?.data?.details || 
          error.response?.data?.message ||
          "An unexpected error occurred. Please try again.";
        toast.error("Failed to save budget", {
          description: errorMessage,
        });
      }
    }
  };

  const saveTaskBudget = async (taskId: number) => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      toast.error("Invalid Input", {
        description: "Please enter a valid positive number.",
      });
      return;
    }

    const originalBudgets = [...budgets];
    const existingBudget = originalBudgets.find((b) => b.task_id === taskId);
    let optimisticBudgets;
    const tempId = Date.now(); // Temporary ID for new items

    // Optimistically update UI
    if (existingBudget) {
      optimisticBudgets = originalBudgets.map((b) =>
        b.budget_id === existingBudget.budget_id
          ? {
              ...b,
              planned_amount: newValue,
              variance: newValue - b.actual_amount,
            }
          : b
      );
    } else {
      const newBudgetItem: Budget = {
        budget_id: tempId,
        project_id: parseInt(projectId),
        wbs_id: undefined,
        task_id: taskId,
        cost_type: "TASK_BUDGET",
        planned_amount: newValue,
        actual_amount: 0,
        variance: newValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      optimisticBudgets = [...originalBudgets, newBudgetItem];
    }

    setBudgets(optimisticBudgets);
    setEditingTask(null);
    setEditValue("");

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (existingBudget) {
        // Update existing budget on the server
        await axios.put(
          `/api/budget/${existingBudget.budget_id}`,
          {
            ...existingBudget,
            planned_amount: newValue,
            variance: newValue - existingBudget.actual_amount,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new budget on the server
        const response = await axios.post(
          `/api/projects/${projectId}/budgets`,
          {
            task_id: taskId,
            cost_type: "TASK_BUDGET",
            planned_amount: newValue,
            actual_amount: 0,
            variance: newValue,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Replace temporary budget with the real one from the server
        const realNewBudget = response.data;
        setBudgets((currentBudgets) =>
          currentBudgets.map((b) =>
            b.budget_id === tempId ? realNewBudget : b
          )
        );
      }

      toast.success("Budget Saved", {
        description: "The planned amount has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving budget:", error);

      // Revert UI on failure
      setBudgets(originalBudgets);

      if (
        error.response?.status === 400 &&
        error.response?.data?.error === "Budget validation failed"
      ) {
        // Display the actual error message from the API
        const errorMessage = 
          error.response?.data?.details || 
          error.response?.data?.error || 
          "The total exceeds the budget limit.";
        toast.error("Budget Validation Failed", {
          description: errorMessage,
        });
      } else {
        // Extract error message from response if available
        const errorMessage = 
          error.response?.data?.error || 
          error.response?.data?.details || 
          error.response?.data?.message ||
          "An unexpected error occurred. Please try again.";
        toast.error("Failed to save budget", {
          description: errorMessage,
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, wbsId: number) => {
    if (e.key === "Enter") {
      saveBudget(wbsId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleTaskKeyPress = (e: React.KeyboardEvent, taskId: number) => {
    if (e.key === "Enter") {
      saveTaskBudget(taskId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleBlur = (wbsId: number) => {
    saveBudget(wbsId);
  };

  const handleTaskBlur = (taskId: number) => {
    saveTaskBudget(taskId);
  };

  const totalPlanned = project?.budget_amount || 0;
  const totalActual = budgets.reduce((sum, b) => sum + b.actual_amount, 0);
  const totalVariance = totalPlanned - totalActual;

  const handleBackButton = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      if (from === "setup" || from === "previous") {
        router.push(`/projects/${projectId}/schedule?from=previous`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    }
  };

  const handleNext = () => {
    router.push(`/projects/${projectId}/team?from=previous`); // Adjust to next step
  };

  const levelDotColor = (level: number) => {
    switch (level % 3) {
      case 0:
        return "bg-accent-violet";
      case 1:
        return "bg-info";
      default:
        return "bg-success";
    }
  };

  /** Fixed-width budget columns shared by every WBS/task row, so the numbers
   *  land in the same place regardless of how deep a row is indented or how
   *  long its name is. */
  const BUDGET_COLS = "grid-cols-[minmax(0,1fr)_repeat(3,120px)]";

  const renderWBSItem = (wbsItem: WBSItem, level: number = 0) => {
    const indentWidth = level * 24; // 24px per level
    const budget = calculateWBSBudget(wbsItem);
    const isEditing = editingWBS === wbsItem.wbs_id;
    const hasChildren = (wbsItem.children?.length ?? 0) > 0;
    const hasTasks = (wbsItem.tasks?.length ?? 0) > 0;
    const isExpandable = hasChildren || hasTasks;

    return (
      <div
        key={`wbs-${wbsItem.wbs_id}`}
        className={level > 0 ? "mt-3" : "mb-4"}
      >
        <div
          className={`grid items-center gap-4 rounded-xl border border-line bg-surface p-4 ${BUDGET_COLS}`}
        >
          <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: `${indentWidth}px` }}>
            {/* Expand/Collapse Button */}
            {isExpandable ? (
              <button
                onClick={() => toggleExpand(wbsItem.wbs_id)}
                aria-label={wbsItem.isExpanded ? "Collapse WBS item" : "Expand WBS item"}
                aria-expanded={wbsItem.isExpanded}
                className="p-1 rounded hover:bg-surface-2 transition-colors shrink-0"
              >
                {wbsItem.isExpanded ? (
                  <ChevronDown size={16} className="text-muted" aria-hidden="true" />
                ) : (
                  <ChevronRight size={16} className="text-muted" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span className="w-3 h-3 shrink-0" />
            )}
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${levelDotColor(level)}`} aria-hidden="true" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-[14.5px] font-semibold text-ink truncate">
                  {wbsItem.name}
                </h3>
                <StatusBadge label="WBS" tone="neutral" />
              </div>
              {wbsItem.description && (
                <p className="text-[12.5px] text-muted truncate">
                  {wbsItem.description}
                </p>
              )}
            </div>
          </div>

          {/* Planned Budget - Clickable for editing (except for root level) */}
          <div
            className={`${
              wbsItem.level === 0 || !canEditBudget()
                ? "cursor-not-allowed opacity-75"
                : `cursor-pointer hover:bg-surface-2 ${
                    isEditing ? "bg-bright-soft ring-1 ring-bright" : ""
                  }`
            } rounded px-2 py-1 transition-colors text-xs`}
            onClick={() =>
              wbsItem.level !== 0 &&
              !isEditing &&
              canEditBudget() &&
              startEditing(wbsItem.wbs_id, budget.planned)
            }
            title={
              wbsItem.level === 0
                ? "Root WBS budget is linked to project budget"
                : !canEditBudget()
                ? "You don't have permission to edit budgets. Only PMO, PJM, or ADMIN users can modify budget data."
                : "Click to edit planned budget"
            }
          >
            {wbsItem.level === 0 && (
              <div className="text-muted text-[11px] opacity-70">(Project)</div>
            )}
            {isEditing && wbsItem.level !== 0 ? (
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-muted">OMR</span>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, wbsItem.wbs_id)}
                  onBlur={(e) => handleBlur(wbsItem.wbs_id)}
                  className="w-16 px-1 py-0.5 text-xs border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                  placeholder="0"
                />
              </div>
            ) : (
              <div className="font-semibold text-ink">
                OMR {budget.planned.toLocaleString()}
              </div>
            )}
          </div>

          <div className="text-xs px-2 py-1">
            <div className="font-semibold text-ink">
              OMR {budget.actual.toLocaleString()}
            </div>
          </div>

          <div className="text-xs px-2 py-1">
            <div className={`font-semibold ${budget.variance < 0 ? "text-danger" : "text-ink"}`}>
              OMR {budget.variance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {wbsItem.isExpanded &&
          wbsItem.children &&
          wbsItem.children.length > 0 && (
            <div className="mt-3">
              {wbsItem.children.map((child) => renderWBSItem(child, level + 1))}
            </div>
          )}

        {/* Render tasks if expanded */}
        {wbsItem.isExpanded && wbsItem.tasks && wbsItem.tasks.length > 0 && (
          <div className="mt-3">
            {wbsItem.tasks.map((task) => renderTask(task, level))}
          </div>
        )}
      </div>
    );
  };

  const renderTask = (task: Task, wbsLevel: number) => {
    const taskBudget = calculateTaskBudget(task);
    const indentWidth = (wbsLevel + 1) * 24; // Additional indent for tasks
    const isEditing = editingTask === task.task_id;

    return (
      <div key={`task-${task.task_id}`} className="mt-3">
        <div
          className={`grid items-center gap-4 rounded-xl border border-line bg-surface-2 p-4 ${BUDGET_COLS}`}
        >
          <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: `${indentWidth}px` }}>
            <CheckSquare className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-[13.5px] font-semibold text-ink truncate">
                  {task.name}
                </h4>
                {task.is_milestone && (
                  <StatusBadge label="Milestone" tone="warning" />
                )}
                {task.is_critical_path && (
                  <StatusBadge label="Critical" tone="danger" />
                )}
                {!task.is_milestone && !task.is_critical_path && (
                  <StatusBadge label="Task" tone="neutral" />
                )}
              </div>
              {task.description && (
                <p className="text-[12px] text-muted truncate">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Planned Budget - Clickable for editing */}
          <div
            className={`${
              !canEditBudget()
                ? "cursor-not-allowed opacity-75"
                : `cursor-pointer hover:bg-surface-3 ${
                    isEditing ? "bg-bright-soft ring-1 ring-bright" : ""
                  }`
            } rounded px-2 py-1 transition-colors text-xs`}
            onClick={() =>
              !isEditing &&
              canEditBudget() &&
              startTaskEditing(task.task_id, taskBudget.planned)
            }
            title={
              !canEditBudget()
                ? "You don't have permission to edit budgets. Only PMO, PJM, or ADMIN users can modify budget data."
                : "Click to edit planned budget"
            }
          >
            {isEditing ? (
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-muted">OMR</span>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) =>
                    handleTaskKeyPress(e, task.task_id)
                  }
                  onBlur={(e) => handleTaskBlur(task.task_id)}
                  className="w-16 px-1 py-0.5 text-xs border border-line rounded bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-bright [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                  placeholder="0"
                />
              </div>
            ) : (
              <div className="font-semibold text-ink">
                OMR {taskBudget.planned.toLocaleString()}
              </div>
            )}
          </div>

          <div className="text-xs px-2 py-1">
            <div className="font-semibold text-ink">
              OMR {taskBudget.actual.toLocaleString()}
            </div>
          </div>

          <div className="text-xs px-2 py-1">
            <div className={`font-semibold ${taskBudget.variance < 0 ? "text-danger" : "text-ink"}`}>
              OMR {taskBudget.variance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Project Budget"
      backHref={
        showNavButtons
          ? `/projects/${projectId}/setup`
          : `/projects/${projectId}`
      }
      backLabel="Back to Project"
      subtitle={
        project ? `${project.name} (${project.project_code})` : undefined
      }
      meta={
        user ? (
          <StatusBadge
            label={`${user.role.name} ${canEditBudget() ? "(Edit Access)" : "(Read Only)"}`}
            tone={canEditBudget() ? "success" : "warning"}
          />
        ) : undefined
      }
      onViewChange={setActiveView}
      activeView={activeView}
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-line border-l-[3px] border-l-danger bg-surface p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="font-display text-[14.5px] font-semibold text-ink mb-1">
                Budget Validation Error
              </h3>
              <p className="text-[13px] text-muted">{error}</p>
            </div>
            <button
              aria-label="Dismiss error"
              onClick={() => setError(null)}
              className="text-faint hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Access Control Notice */}
      {!canEditBudget() && (
        <div className="mb-6 rounded-xl border border-line border-l-[3px] border-l-info bg-surface p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-info mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="font-display text-[14.5px] font-semibold text-ink mb-1">
                Read-Only Access
              </h3>
              <p className="text-[13px] text-muted">
                You have read-only access to this budget page. Only users with
                PMO, PJM, or ADMIN roles can edit budget data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Planned"
          value={`OMR ${totalPlanned.toLocaleString()}`}
          icon={DollarSign}
          tone="brand"
        />
        <StatCard
          label="Total Actual"
          value={`OMR ${totalActual.toLocaleString()}`}
          icon={BarChart3}
          tone="info"
        />
        <StatCard
          label="Total Variance"
          value={`OMR ${totalVariance.toLocaleString()}`}
          icon={Calendar}
          tone={totalVariance < 0 ? "danger" : "success"}
        />
      </div>

      {/* Hierarchical WBS Budget View */}
      <div className="space-y-4">
        {!loading && wbsData.length > 0 && (
          <div className={`grid gap-4 px-4 text-[11px] font-medium uppercase tracking-wide text-muted ${BUDGET_COLS}`}>
            <span>WBS / Task</span>
            <span>Planned</span>
            <span>Actual</span>
            <span>Variance</span>
          </div>
        )}
        {loading ? (
          <div className="text-center py-8">
            <Spinner size={32} className="mx-auto text-bright-primary" />
            <p className="mt-2 text-muted">
              Loading budget data...
            </p>
          </div>
        ) : wbsData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted">
              No WBS items found for this project.
            </p>
          </div>
        ) : (
          wbsData.map((wbsItem) => renderWBSItem(wbsItem))
        )}
      </div>

      {/* Navigation Buttons */}
      {showNavButtons && (
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => {
              if (showNavButtons) {
                router.push(`/projects/${projectId}/setup`);
              } else {
                router.push(`/projects/${projectId}`);
              }
            }}
            className="flex items-center space-x-2 px-6 py-3 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>{showNavButtons ? "Back to Setup" : "Back to Project"}</span>
          </button>
          <button
            onClick={async () => {
              if (!canEditBudget()) {
                toast.error("Access Denied", {
                  description:
                    "You don't have permission to modify project setup. Only PMO, PJM, or ADMIN users can mark budget setup as complete.",
                });
                return;
              }

              try {
                const token =
                  typeof window !== "undefined"
                    ? localStorage.getItem("token")
                    : null;
                await axios.patch(
                  `/api/projects/${projectId}/setup`,
                  { budget: true },
                  token
                    ? {
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    : undefined
                );
                router.push(`/projects/${projectId}/team?from=previous`);
              } catch (error) {
                toast.error("Failed to mark budget as complete.");
              }
            }}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
              canEditBudget()
                ? "bg-info text-white hover:opacity-90"
                : "bg-faint text-muted cursor-not-allowed opacity-75"
            }`}
            disabled={!canEditBudget()}
            title={
              !canEditBudget()
                ? "You don't have permission to modify project setup. Only PMO, PJM, or ADMIN users can mark budget setup as complete."
                : ""
            }
          >
            <span>Next: Team Setup</span>
            <Plus size={16} />
          </button>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ProjectBudgetPage;
