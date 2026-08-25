"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Calendar,
  Clock,
  Users,
  BarChart,
  Filter,
  Search,
  Download,
  Settings,
  Plus,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  ArrowLeft,
  Home,
  FolderOpen,
  Eye,
  EyeOff,
  Maximize,
  Edit,
  Trash2,
  Minimize,
  ChevronDown,
  ChevronRight,
  X,
  Building2 as Building,
  Info,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import type {
  User,
  Task,
  GanttTask,
  ProjectDetails,
  GanttResourceAllocation,
  ResourceWorkload,
  ResourceWorkloadResponse,
  TimelineColumn,
  UserRole,
} from "./_components/types";
import CriticalPathManagementModal from "./_components/CriticalPathManagementModal";
import ResourceDetailModal from "./_components/ResourceDetailModal";
import CreateTaskModal from "./_components/CreateTaskModal";
import ResourceAssignmentModal from "./_components/GanttResourceAssignmentModal";

const ProjectGanttPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [userRole] = useState<UserRole>("admin");
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);

  // Permission checking function
  const canEditGantt = () => {
    return user?.role?.name && ['PMO', 'PJM', 'ADMIN'].includes(user.role.name);
  };

  // Fetch user data function
  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
    }
  };
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [viewMode, setViewMode] = useState<
    "days" | "weeks" | "months" | "quarters"
  >("weeks");
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [resourceAllocations, setResourceAllocations] = useState<
    GanttResourceAllocation[]
  >([]);
  const [showResourceView, setShowResourceView] = useState(false);
  const [resourceWorkloads, setResourceWorkloads] = useState<
    ResourceWorkload[]
  >([]);
  const [workloadSummary, setWorkloadSummary] = useState<any>(null);
  const [loadingResourceView, setLoadingResourceView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineScale, setTimelineScale] = useState(100);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"progress" | "timeline">(
    "progress"
  );

  // Modal states (copied from schedule page)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [wbsItems, setWbsItems] = useState<any[]>([]);
  const [createType, setCreateType] = useState<"task" | "milestone">("task");

  // Resource assignment states
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedTaskForResource, setSelectedTaskForResource] = useState<
    any | null
  >(null);
  const [resources, setResources] = useState<any[]>([]);
  const [resourceAssignments, setResourceAssignments] = useState<any[]>([]);

  // Resource detail states
  const [showResourceDetailModal, setShowResourceDetailModal] = useState(false);
  const [selectedResourceAssignment, setSelectedResourceAssignment] = useState<
    any | null
  >(null);

  // Delete confirmation states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number | string;
    name: string;
    type: string;
  } | null>(null);

  // Task edit states
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<GanttTask | null>(null);

  // Critical path calculation states
  const [calculatingCriticalPath, setCalculatingCriticalPath] = useState(false);
  const [criticalPathCalculated, setCriticalPathCalculated] = useState(false);
  const [criticalPathError, setCriticalPathError] = useState<string | null>(
    null
  );

  // Critical path management states
  const [showCriticalPathModal, setShowCriticalPathModal] = useState(false);
  const [criticalPathRisks, setCriticalPathRisks] = useState<any[]>([]);
  const [criticalPathActions, setCriticalPathActions] = useState<any[]>([]);

  // Helper functions
  const calculateDuration = (startDate: Date, endDate: Date): number => {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert to days
  };

  const getTaskStatus = (
    progress: number,
    status?: string
  ): "todo" | "in_progress" | "completed" | "on_hold" => {
    if (status) {
      switch (status.toLowerCase()) {
        case "completed":
          return "completed";
        case "on_hold":
          return "on_hold";
        case "in_progress":
          return "in_progress";
        case "todo":
          return "todo";
        default:
          break;
      }
    }

    if (progress === 0) return "todo";
    if (progress === 100) return "completed";
    if (progress > 0 && progress < 100) return "in_progress";
    return "todo";
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchWBSData();
      fetchResources();
    }
  }, [projectId]);

  // Fetch resource workloads when resource view is enabled
  useEffect(() => {
    if (showResourceView && projectId) {
      fetchResourceWorkloads();
    }
  }, [showResourceView, projectId]);

  // // Update tasks whenever resourceAssignments change
  // useEffect(() => {
  //   if (resourceAssignments.length > 0 && tasks.length > 0) {
  //     updateTasksWithResourceAssignments();
  //   }
  // }, [resourceAssignments]);

  const fetchWBSData = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/wbs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setWbsItems(response.data);
    } catch (error) {
      console.error("Error fetching WBS data:", error);
      toast.error("Failed to load WBS data");
    }
  };

  const fetchResources = async () => {
    try {
      const response = await axios.get("/api/resources", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setResources(response.data.availableResources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
    }
  };

  const fetchResourceWorkloads = async () => {
    if (!projectId) return;

    setLoadingResourceView(true);
    try {
      const response = await axios.get(
        `/api/resources/workload?project_id=${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const workloadData: ResourceWorkloadResponse = response.data;
      setResourceWorkloads(workloadData.resources);
      setWorkloadSummary(workloadData.summary);
      console.log("Resource workloads:", workloadData);
    } catch (error) {
      console.error("Error fetching resource workloads:", error);
      toast.error("Failed to load resource workload data");
      setResourceWorkloads([]);
      setWorkloadSummary(null);
    } finally {
      setLoadingResourceView(false);
    }
  };

  const extractResourceAssignments = (originalTasks: any[]) => {
    // Extract all resource assignments from the original task data
    const allAssignments: any[] = [];

    originalTasks.forEach((task) => {
      if (task.resourceAssignments && task.resourceAssignments.length > 0) {
        task.resourceAssignments.forEach((assignment: any) => {
          allAssignments.push({
            ...assignment,
            task_id: task.task_id, // Ensure task_id is included
          });
        });
      }
    });

    setResourceAssignments(allAssignments);
    console.log("el assignments ahe: ", allAssignments);
  };

  // updateTasksWithResourceAssignments function removed - resource assignments now come directly from API

  const fetchProjectData = async () => {
    setIsLoading(true);
    try {
      // Fetch project details with WBS and tasks included
      const projectResponse = await axios.get(`/api/projects/${projectId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const projectData = projectResponse.data;

      console.log("Project Data:", projectData);
      console.log("Project Tasks:", projectData.tasks);
      console.log("Sample Task:", projectData.tasks?.[0]);

      // Transform project data to match our interface
      const transformedProject: ProjectDetails = {
        id: projectData.project_id,
        name: projectData.name,
        description:
          projectData.description || projectData.short_description || "",
        status: projectData.status,
        startDate: new Date(projectData.start_date),
        endDate: new Date(projectData.planned_end_date || projectData.end_date),
        progress: projectData.progress_percentage || 0,
        manager: projectData.creator?.account?.first_name
          ? `${projectData.creator.account.first_name} ${projectData.creator.account.last_name}`
          : "Unknown",
        budget: projectData.budget_amount || 0,
        team:
          projectData.team_members?.map((member: any) =>
            member.user?.account?.first_name
              ? `${member.user.account.first_name} ${member.user.account.last_name}`
              : "Unknown"
          ) || [],
      };

      setProject(transformedProject);

      // Show only tasks with WBS information
      const allTasks: GanttTask[] = [];

      console.log("Project WBS:", projectData.wbs);
      console.log("Project tasks:", projectData.tasks);

      // Create a WBS lookup map for easier access
      const wbsMap = new Map();
      if (projectData.wbs) {
        projectData.wbs.forEach((wbs: any) => {
          wbsMap.set(wbs.wbs_id, wbs);
        });
      }

      // Process only tasks (no WBS containers)
      if (projectData.tasks && projectData.tasks.length > 0) {
        projectData.tasks.forEach((task: any, index: number) => {
          // Get the WBS this task belongs to
          const parentWBS = task.wbs_id ? wbsMap.get(task.wbs_id) : null;

          console.log(
            `Task ${task.name} resourceAssignments:`,
            task.resourceAssignments
          );
          console.log(
            `Task ${task.name} critical path:`,
            task.is_critical_path
          );

          const ganttTask: GanttTask = {
            id: `task-${task.task_id}`,
            wbsId: task.wbs?.wbs_code || parentWBS?.wbs_code || "UNASSIGNED",
            name: task.name || "Unnamed Task",
            description: task.description || "",
            startDate: new Date(task.start_date || projectData.start_date),
            endDate: new Date(
              task.end_date || task.due_date || projectData.planned_end_date
            ),
            duration: calculateDuration(
              new Date(task.start_date || projectData.start_date),
              new Date(
                task.end_date || task.due_date || projectData.planned_end_date
              )
            ),
            progress: task.progress_percentage || 0,
            status: getTaskStatus(task.progress_percentage || 0, task.status),
            priority: task.priority || "medium",
            assignedTo:
              task.resourceAssignments?.map(
                (ra: any) => ra.resource?.name || "Unknown Resource"
              ) || [],
            dependencies: [], // TODO: Add dependency mapping if available
            projectId: projectData.project_id,
            projectName: projectData.name,
            isMilestone: task.is_milestone || false,
            isOnCriticalPath: task.is_critical_path || false,
            estimatedEffort: task.estimated_hours || 8,
            actualEffort: task.actual_hours || 0,
            resourceAllocation: 80,
            cost: task.budget_amount || 0,
            // Store WBS info for display
            parentTaskId: undefined,
            wbsName: parentWBS?.name || "Unassigned",
          };

          allTasks.push(ganttTask);
        });
      }

      console.log("Transformed Tasks:", allTasks);
      setTasks(allTasks);

      // Extract resource assignments from original task data
      if (projectData.tasks) {
        extractResourceAssignments(projectData.tasks);
        console.log("Resource Assignments:", resourceAssignments);
      }

      // Transform team members for resource allocation
      const resourceAllocations: GanttResourceAllocation[] = (
        projectData.team_members || []
      ).map((member: any) => ({
        userId: member.user?.user_id || member.id || "unknown",
        userName: member.user?.account?.first_name
          ? `${member.user.account.first_name} ${member.user.account.last_name}`
          : "Unknown",
        allocatedHours: member.workload || 80,
        availableHours: 160, // Standard work hours per month
        utilization: ((member.workload || 80) / 160) * 100,
        conflicts: member.workload > 160 ? ["Overallocated"] : [],
      }));

      setResourceAllocations(resourceAllocations);

      // Resource assignments are now included directly in task data from the API
    } catch (error) {
      console.error("Error fetching project data:", error);
      // Set empty state if API fails
      setProject({
        id: projectId,
        name: "Unknown Project",
        description: "Failed to load project data",
        status: "unknown",
        startDate: new Date(),
        endDate: new Date(),
        progress: 0,
        manager: "Unknown",
        budget: 0,
        team: [],
      });
      setTasks([]);
      setResourceAllocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to create tasks");
      return;
    }

    try {
      setCreating(true);

      const response = await axios.post("/api/tasks", taskData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 201) {
        toast.success("Task created successfully!");
        setShowCreateModal(false);
        // Refresh the data
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error(error.response?.data?.error || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleResourceAssignment = async (assignmentData: any) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to assign resources");
      return;
    }

    try {
      const response = await axios.post(
        "/api/resourceAssignments",
        assignmentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data) {
        toast.success("Resource assigned successfully");
        setShowResourceModal(false);
        setSelectedTaskForResource(null);
        // Refresh data to show the new assignment
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error assigning resource:", error);
      if (error.response?.status === 400) {
        const errorData = error.response.data;

        // Handle specific backend validation errors
        if (errorData.reason === "resource_not_available") {
          toast.error("Resource is not available for assignments");
        } else if (errorData.reason === "capacity_exceeded") {
          toast.error("Resource capacity exceeded for this time period");
        } else if (errorData.conflictDetails) {
          // Handle overlapping assignments
          toast.error(
            "Resource has conflicting assignments during this period"
          );
          if (errorData.alternatives && errorData.alternatives.length > 0) {
            toast.info(
              `${errorData.alternatives.length} alternative resources available`
            );
          }
        } else if (errorData.details) {
          // Handle planned hours vs required hours validation
          if (
            errorData.details.plannedHours &&
            errorData.details.requiredHours
          ) {
            toast.error(
              `Planned hours (${errorData.details.plannedHours}) exceed available time (${errorData.details.requiredHours} hours)`
            );
          } else if (errorData.details.capacity) {
            toast.error(
              `Resource capacity insufficient: ${errorData.details.capacity}h/day`
            );
          } else {
            toast.error(
              errorData.error || "Resource assignment validation failed"
            );
          }
        } else {
          toast.error(errorData.error || "Resource assignment failed");
        }

        // Handle alternative resource suggestions if available
        if (errorData.alternatives && errorData.alternatives.length > 0) {
          console.log("Alternative resources:", errorData.alternatives);
          toast.info(
            `${errorData.alternatives.length} alternative resources suggested`
          );
        }
      } else {
        toast.error("Failed to assign resource");
      }
    }
  };

  const handleResourceAssignmentUpdate = async (
    assignmentId: number,
    updateData: any
  ) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to update resource assignments");
      return;
    }

    try {
      const response = await axios.put(
        `/api/resourceAssignments/${assignmentId}`,
        updateData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data) {
        toast.success("Resource assignment updated successfully");
        setShowResourceDetailModal(false);
        setSelectedResourceAssignment(null);
        // Refresh data to show the updated assignment
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error updating resource assignment:", error);
      toast.error(
        error.response?.data?.error || "Failed to update resource assignment"
      );
    }
  };

  const handleResourceAssignmentDelete = async (assignmentId: number) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to delete resource assignments");
      return;
    }

    try {
      const response = await axios.delete(
        `/api/resourceAssignments/${assignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status === 200) {
        toast.success("Resource assignment deleted successfully");
        setShowResourceDetailModal(false);
        setSelectedResourceAssignment(null);
        // Refresh data to show the updated assignment
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error deleting resource assignment:", error);
      toast.error(
        error.response?.data?.error || "Failed to delete resource assignment"
      );
    }
  };

  const handleResourceClick = (assigneeName: string, task: GanttTask) => {
    // Find the resource assignment based on the assignee name and task
    const assignment = resourceAssignments.find(
      (assignment) =>
        assignment.resource?.name === assigneeName &&
        assignment.task_id === parseInt(task.id.replace("task-", ""))
    );

    if (assignment) {
      setSelectedResourceAssignment(assignment);
      setShowResourceDetailModal(true);
    } else {
      toast.error("Resource assignment details not found");
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to update task status");
      return;
    }

    try {
      const response = await axios.put(
        `/api/tasks/${taskId.replace("task-", "")}`,
        { status: newStatus },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data) {
        toast.success("Task status updated successfully");
        // Refresh data to show the updated status
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error updating task status:", error);
      const errorData = error.response?.data;
      if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
        // Show detailed dependency error messages
        const errorMessage = errorData.error || "Cannot update task status";
        const reasons = errorData.reasons.join(". ");
        toast.error(`${errorMessage}: ${reasons}`);
      } else {
        toast.error(errorData?.error || "Failed to update task status");
      }
    }
  };

  const handleDeleteConfirmation = (
    assignmentId: number,
    resourceName: string
  ) => {
    setItemToDelete({
      id: assignmentId,
      name: resourceName,
      type: "resource assignment",
    });
    setShowDeleteConfirmation(true);
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to delete tasks");
      return;
    }

    try {
      // Get user info from localStorage for headers
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole") || "admin";
      const userId = localStorage.getItem("userId") || "1";

      if (!token) {
        toast.error("Authentication token missing. Please log in again.");
        return;
      }

      const response = await axios.delete(
        `/api/tasks/${taskId.replace("task-", "")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-user-role": userRole,
            "x-user-id": userId,
          },
        }
      );

      if (response.status === 200) {
        toast.success("Task deleted successfully");
        setSelectedTask(null);
        // Refresh data to remove the deleted task
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error deleting task:", error);

      let errorMessage = "Failed to delete task";
      if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You do not have permission to delete this task.";
      } else if (error.response?.status === 404) {
        errorMessage = "Task not found. It may have been already deleted.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage);
    }
  };

  const handleTaskEdit = (task: GanttTask) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };

  const handleTaskDeleteConfirmation = (task: GanttTask) => {
    setItemToDelete({
      id: task.id,
      name: task.name,
      type: "task",
    });
    setShowDeleteConfirmation(true);
  };

  const handleTaskUpdate = async (taskData: any) => {
    if (!canEditGantt()) {
      toast.error("You don't have permission to update tasks");
      return;
    }

    try {
      const response = await axios.put(
        `/api/tasks/${taskToEdit?.id.replace("task-", "")}`,
        taskData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data) {
        toast.success("Task updated successfully");
        setShowEditTaskModal(false);
        setTaskToEdit(null);
        setSelectedTask(null);
        // Refresh data to show the updated task
        await fetchProjectData();
      }
    } catch (error: any) {
      console.error("Error updating task:", error);
      const errorData = error.response?.data;
      
      // Handle dependency date violations
      if (errorData?.violations && Array.isArray(errorData.violations) && errorData.violations.length > 0) {
        const errorMessage = errorData.error || "Task dates violate dependency constraints";
        const violations = errorData.violations.join(". ");
        toast.error(errorMessage, {
          description: violations + (errorData.canForce ? " You can set 'force: true' to override." : "")
        });
      }
      // Handle dependency status violations
      else if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
        const errorMessage = errorData.error || "Cannot update task status";
        const reasons = errorData.reasons.join(". ");
        toast.error(errorMessage, {
          description: reasons
        });
      } else {
        toast.error(errorData?.error || "Failed to update task");
      }
    }
  };

  const handleConfirmedDelete = async () => {
    if (itemToDelete) {
      if (itemToDelete.type === "resource assignment") {
        await handleResourceAssignmentDelete(itemToDelete.id as number);
      } else if (itemToDelete.type === "task") {
        await handleTaskDelete(itemToDelete.id as string);
      }
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
    }
  };

  const getProjectData = async (id: string): Promise<ProjectDetails> => {
    try {
      const response = await axios.get(`/api/projects/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const projectData = response.data;
      console.log(projectData);

      return {
        id: projectData.project_id,
        name: projectData.name,
        description:
          projectData.description || projectData.short_description || "",
        status: projectData.status,
        startDate: new Date(projectData.start_date),
        endDate: new Date(projectData.planned_end_date || projectData.end_date),
        progress: projectData.progress_percentage || 0,
        manager: projectData.creator?.account?.first_name
          ? `${projectData.creator.account.first_name} ${projectData.creator.account.last_name}`
          : "Unknown",
        budget: projectData.budget_amount || 0,
        team:
          projectData.team_members?.map((member: any) =>
            member.user?.account?.first_name
              ? `${member.user.account.first_name} ${member.user.account.last_name}`
              : "Unknown"
          ) || [],
      };
    } catch (err) {
      console.log(err);
      // Return a default project
      return {
        id: id,
        name: "Unknown Project",
        description: "Failed to load project data",
        status: "unknown",
        startDate: new Date(),
        endDate: new Date(),
        progress: 0,
        manager: "Unknown",
        budget: 0,
        team: [],
      };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "at-risk":
        return "bg-red-500";
      case "on-hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-gray-400";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesAssignee =
      assigneeFilter === "all" ||
      task.assignedTo.some((assignee) => assignee === assigneeFilter);
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;

    // Role-based filtering
    if (userRole === "technical") {
      const userAssigned = task.assignedTo.includes("Current User"); // Would be actual user
      return matchesSearch && matchesStatus && matchesPriority && userAssigned;
    }

    return matchesSearch && matchesStatus && matchesAssignee && matchesPriority;
  });

  const renderProjectStats = () => {
    if (!project) return null;

    // Filter out milestones from task counts
    const actualTasks = tasks.filter((t) => !t.isMilestone);
    const completedTasks = actualTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const inProgressTasks = actualTasks.filter(
      (t) => t.status === "in_progress"
    ).length;
    const onHoldTasks = actualTasks.filter(
      (t) => t.status === "on_hold"
    ).length;
    const criticalPathTasks = tasks.filter((t) => t.isOnCriticalPath).length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Total Tasks
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {actualTasks.length}
              </p>
            </div>
            <BarChart className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Completed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedTasks}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Critical Path
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {criticalPathTasks}
              </p>
              {criticalPathTasks > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tasks
                    .filter((t) => t.isOnCriticalPath)
                    .reduce((sum, task) => sum + task.duration, 0)}{" "}
                  days total
                </p>
              )}
              {criticalPathRisks.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                    {criticalPathRisks.length} risks detected
                  </p>
                  <button
                    onClick={() => setShowCriticalPathModal(true)}
                    className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-red-500" />
              {criticalPathCalculated && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {criticalPathRisks.length > 0 && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                On Hold
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {onHoldTasks}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>
    );
  };

  const renderRoleSpecificControls = () => {
    switch (userRole) {
      case "admin":
      case "project-manager":
        return (
          <div className="flex flex-wrap gap-3">
            {canEditGantt() ? (
              <>
                {/* <button
                  onClick={() => {
                    setCreateType("task");
                    setShowCreateModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button> */}
                <button
                  onClick={() => {
                    setCreateType("milestone");
                    setShowCreateModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Add Milestone
                </button>
                {/* <button
                  onClick={() => {
                    if (tasks.length === 0) {
                      toast.error("No tasks available to assign resources to");
                      return;
                    }
                    // Don't pre-select a task, let user choose from dropdown
                    setSelectedTaskForResource(null);
                    setShowResourceModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Assign Resources
                </button> */}
                <button
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  onClick={() => {
                    router.push(`/projects/${projectId}/baseline`);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Baseline Compare
                </button>
              </>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                Viewing in read-only mode
              </div>
            )}
          </div>
        );

      case "technical":
        return (
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary">
              <CheckCircle className="w-4 h-4 mr-2" />
              Update Progress
            </button>
            <button className="btn-secondary">
              <Clock className="w-4 h-4 mr-2" />
              Log Time
            </button>
          </div>
        );

      case "pmo":
        return (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary">
              <BarChart className="w-4 h-4 mr-2" />
              Project Report
            </button>
            <button className="btn-secondary">
              <Settings className="w-4 h-4 mr-2" />
              Compliance Check
            </button>
          </div>
        );

      case "executive":
        return (
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Timeline
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProjectProgressView = () => {
    let filteredTasks = tasks.filter((task) => {
      const matchesSearch =
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesAssignee =
        assigneeFilter === "all" ||
        task.assignedTo.some((assignee) => assignee === assigneeFilter);
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return (
        matchesSearch && matchesStatus && matchesAssignee && matchesPriority
      );
    });

    // Role-based filtering for project context
    if (userRole === "technical") {
      filteredTasks = filteredTasks.filter((task) =>
        task.assignedTo.includes("Current User")
      );
    } else if (userRole === "executive") {
      filteredTasks = filteredTasks.filter(
        (task) => task.isMilestone || task.isOnCriticalPath
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600 dark:text-gray-300">
              <div className="col-span-3">Task Name</div>
              <div className="col-span-2">WBS Package</div>
              <div className="col-span-1">Duration</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-2">Assigned To</div>
              <div className="col-span-2">Status</div>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                {userRole === "technical"
                  ? "No tasks assigned to you in this project."
                  : userRole === "executive"
                  ? "No strategic milestones found in this project."
                  : "No tasks found matching the current filters."}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id);

                return (
                  <div key={task.id}>
                    <div
                      className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 ${
                        task.isOnCriticalPath && showCriticalPath
                          ? "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10"
                          : ""
                      }`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="col-span-3">
                        <div className="flex items-center">
                          {task.isMilestone ? (
                            <Target
                              className={`w-4 h-4 mr-2 ${
                                task.isOnCriticalPath
                                  ? "text-red-500"
                                  : "text-yellow-500"
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${
                                task.priority === "critical"
                                  ? "bg-red-600"
                                  : task.priority === "high"
                                  ? "bg-orange-500"
                                  : task.priority === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                              }`}
                            />
                          )}

                          <div className="flex-1">
                            <div
                              className={`font-medium ${
                                task.isOnCriticalPath && showCriticalPath
                                  ? "text-red-900 dark:text-red-100"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {task.name}
                              {task.isOnCriticalPath && showCriticalPath && (
                                <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-md">
                                  Critical Path
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {task.wbsId}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="text-sm">
                          <div
                            className={`font-medium ${
                              task.wbsName === "Unassigned"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {task.wbsName || "Unassigned"}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {task.wbsId}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1">
                        <div className="text-sm">
                          <div className="text-gray-900 dark:text-white">
                            {task.duration} days
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {task.startDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {task.endDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                task.status === "completed"
                                  ? "bg-green-500"
                                  : task.status === "in_progress"
                                  ? "bg-blue-500"
                                  : task.status === "on_hold"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                              }`}
                              style={{
                                width: `${task.progress}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {task.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="flex flex-wrap gap-1">
                          {task.assignedTo.length === 0 ? (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs italic">
                              No resources assigned
                            </span>
                          ) : (
                            <>
                              {task.assignedTo
                                .slice(0, 3)
                                .map((assignee, index) => {
                                  // Find the resource assignment for this assignee and task
                                  const assignment = resourceAssignments.find(
                                    (ra) =>
                                      ra.resource?.name === assignee &&
                                      ra.task_id ===
                                        parseInt(task.id.replace("task-", ""))
                                  );

                                  // Check if this resource assignment is completed
                                  const isCompleted =
                                    assignment &&
                                    assignment.actual_hours >=
                                      assignment.planned_hours;

                                  return (
                                    <button
                                      key={index}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResourceClick(assignee, task);
                                      }}
                                      className={`px-2 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                                        isCompleted
                                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
                                          : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                                      }`}
                                      title={`Click to view details for ${assignee}${
                                        isCompleted
                                          ? " (Completed)"
                                          : " (In Progress)"
                                      }`}
                                    >
                                      {assignee
                                        .split(" ")
                                        .map((name) => name[0])
                                        .join("")}
                                    </button>
                                  );
                                })}
                              {task.assignedTo.length > 3 && (
                                <span
                                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs"
                                  title={`${task.assignedTo
                                    .slice(3)
                                    .join(", ")}`}
                                >
                                  +{task.assignedTo.length - 3}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            task.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : task.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : task.status === "on_hold"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {task.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGanttTimelineView = () => {
    let filteredTasks = tasks.filter((task) => {
      const matchesSearch =
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesAssignee =
        assigneeFilter === "all" ||
        task.assignedTo.some((assignee) => assignee === assigneeFilter);
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return (
        matchesSearch && matchesStatus && matchesAssignee && matchesPriority
      );
    });

    if (userRole === "technical") {
      filteredTasks = filteredTasks.filter((task) =>
        task.assignedTo.includes("Current User")
      );
    } else if (userRole === "executive") {
      filteredTasks = filteredTasks.filter(
        (task) => task.isMilestone || task.isOnCriticalPath
      );
    }

    const timelineColumns = getTimelineColumns();

    // Calculate today's position on the timeline in pixels
    const calculateTodayPositionPx = (
      today: Date,
      timelineColumns: TimelineColumn[]
    ): number | null => {
      if (
        !project?.startDate ||
        !project?.endDate ||
        timelineColumns.length === 0
      )
        return null;

      const projectStart = new Date(project.startDate);
      const projectEnd = new Date(project.endDate);
      const todayTime = today.getTime();

      if (
        todayTime < projectStart.getTime() ||
        todayTime > projectEnd.getTime()
      )
        return null;

      // Fixed column width (must match CSS = 128px)
      const columnWidthPx = 128;
      const totalTimelineWidthPx = timelineColumns.length * columnWidthPx;

      const projectDuration = projectEnd.getTime() - projectStart.getTime();
      const timeFromStart = todayTime - projectStart.getTime();

      // Calculate position in pixels directly
      return (timeFromStart / projectDuration) * totalTimelineWidthPx;
    };

    // Group tasks by WBS for better organization
    const tasksByWBS = filteredTasks.reduce((acc, task) => {
      const wbsKey = task.wbsId || "unassigned";
      if (!acc[wbsKey]) {
        acc[wbsKey] = {
          wbsInfo: {
            name: task.wbsName || "Unassigned",
            code: task.wbsId || "N/A",
          },
          tasks: [],
        };
      }
      acc[wbsKey].tasks.push(task);
      return acc;
    }, {} as Record<string, { wbsInfo: { name: string; code: string }; tasks: GanttTask[] }>);

    if (filteredTasks.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Tasks Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {userRole === "technical"
                ? "No tasks are currently assigned to you in this project."
                : userRole === "executive"
                ? "No strategic milestones or critical path items found."
                : "No tasks match your current filter criteria. Try adjusting your search or filters."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Enhanced Timeline Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 overflow-hidden">
          <div className="p-6 border-b border-blue-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Project Timeline
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {project?.name} • {filteredTasks.length} tasks • {viewMode}{" "}
                    view
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-3 py-1 bg-white dark:bg-gray-800 rounded-lg border">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {project?.startDate.toLocaleDateString()} -{" "}
                    {project?.endDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  Completed
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  In Progress
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  Not Started
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className="text-gray-600 dark:text-gray-300">
                  On Hold
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-3 h-3 text-purple-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  Milestone
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-3 h-3 text-red-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  Critical Path
                </span>
              </div>
            </div>
          </div>

          {/* Unified Timeline with Header and Content in Same Scroll */}
          <div className="overflow-x-auto bg-white dark:bg-gray-800">
            <div
              className="min-w-max"
              style={{
                minWidth: `${384 + timelineColumns.length * 128}px`,
              }}
            >
              {/* Timeline Scale Header */}
              <div className="flex border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <div className="w-96 px-6 py-4 border-r border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Task Structure
                    </span>
                  </div>
                </div>
                {timelineColumns.map((col, index) => (
                  <div
                    key={index}
                    className={`w-32 px-2 py-4 text-center border-r border-gray-200 dark:border-gray-600 ${
                      col.isWeekend ? "bg-gray-100 dark:bg-gray-600" : ""
                    }`}
                    style={{
                      minWidth: "128px",
                      width: "128px",
                    }}
                  >
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {col.label}
                    </div>
                    {viewMode === "days" && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {col.date.toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </div>
                    )}
                    {viewMode === "weeks" && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {col.date.toLocaleDateString("en-US", {
                          day: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {Object.entries(tasksByWBS).map(([wbsKey, wbsGroup]) => (
                <div
                  key={wbsKey}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  {/* WBS Header */}
                  <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex">
                      <div className="w-96 px-6 py-3 flex items-center space-x-3 border-r border-gray-200 dark:border-gray-600">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                          <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {wbsGroup.wbsInfo.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {wbsGroup.wbsInfo.code} • {wbsGroup.tasks.length}{" "}
                            tasks
                          </div>
                        </div>
                      </div>
                      <div
                        className="flex"
                        style={{
                          width: `${timelineColumns.length * 128}px`,
                        }}
                      >
                        {/* Timeline background for WBS */}
                        {timelineColumns.map((col, index) => (
                          <div
                            key={index}
                            className="w-32 border-r border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600"
                            style={{
                              width: "128px",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tasks in this WBS */}
                  {wbsGroup.tasks.map((task, taskIndex) => {
                    const position = calculateTaskPosition(
                      task,
                      timelineColumns
                    );
                    const isHovered = selectedTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`flex transition-all duration-200 ${
                          task.isOnCriticalPath && showCriticalPath
                            ? "bg-red-50 dark:bg-red-900/10"
                            : isHovered
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        } ${
                          taskIndex < wbsGroup.tasks.length - 1
                            ? "border-b border-gray-100 dark:border-gray-700"
                            : ""
                        }`}
                        onClick={() => setSelectedTask(task)}
                      >
                        {/* Enhanced Task Info */}
                        <div className="w-96 px-6 py-4 border-r border-gray-200 dark:border-gray-600">
                          <div className="flex items-start space-x-3">
                            {/* Task Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                              {task.isMilestone ? (
                                <div
                                  className={`w-6 h-6 ${
                                    task.isOnCriticalPath
                                      ? "bg-red-100 dark:bg-red-900"
                                      : "bg-purple-100 dark:bg-purple-900"
                                  } rounded-lg flex items-center justify-center`}
                                >
                                  <Target
                                    className={`w-3 h-3 ${
                                      task.isOnCriticalPath
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-purple-600 dark:text-purple-400"
                                    }`}
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                    task.priority === "critical"
                                      ? "bg-red-100 dark:bg-red-900"
                                      : task.priority === "high"
                                      ? "bg-orange-100 dark:bg-orange-900"
                                      : task.priority === "medium"
                                      ? "bg-yellow-100 dark:bg-yellow-900"
                                      : "bg-gray-100 dark:bg-gray-700"
                                  }`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      task.priority === "critical"
                                        ? "bg-red-500"
                                        : task.priority === "high"
                                        ? "bg-orange-500"
                                        : task.priority === "medium"
                                        ? "bg-yellow-500"
                                        : "bg-gray-400"
                                    }`}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Task Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4
                                  className={`font-medium text-sm truncate ${
                                    task.isOnCriticalPath && showCriticalPath
                                      ? "text-red-900 dark:text-red-100"
                                      : "text-gray-900 dark:text-white"
                                  }`}
                                >
                                  {task.name}
                                </h4>
                                {task.isOnCriticalPath && (
                                  <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />
                                )}
                              </div>

                              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{task.duration}d</span>
                                </span>
                                {task.assignedTo.length > 0 && (
                                  <span className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>{task.assignedTo.length}</span>
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    task.status === "completed"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                      : task.status === "in_progress"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                      : task.status === "on_hold"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {task.status.replace("_", " ").toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Timeline Bar */}
                        <div
                          className="relative py-4"
                          style={{
                            width: `${timelineColumns.length * 128}px`,
                          }}
                        >
                          {position && (
                            <>
                              {/* Today indicator line */}
                              {(() => {
                                const today = new Date();
                                const todayPositionPx =
                                  calculateTodayPositionPx(
                                    today,
                                    timelineColumns
                                  );
                                if (todayPositionPx !== null) {
                                  return (
                                    <div
                                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 opacity-60"
                                      style={{
                                        left: `${todayPositionPx}px`,
                                      }}
                                    >
                                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Task Bar */}
                              <div
                                className={`absolute top-1/2 transform -translate-y-1/2 rounded-lg shadow-sm transition-all duration-200 ${
                                  isHovered ? "shadow-md scale-105" : ""
                                } ${task.isMilestone ? "h-4" : "h-8"} group`}
                                style={{
                                  left: `${position.leftPx}px`,
                                  width: `${position.widthPx}px`,
                                }}
                                title={`${task.name} - ${task.progress}% Complete (${task.duration}d)`}
                              >
                                {task.isMilestone ? (
                                  // Milestone Diamond with Progress Indicator
                                  <div className="relative">
                                    <div
                                      className={`w-4 h-4 transform rotate-45 ${
                                        task.isOnCriticalPath
                                          ? "bg-red-500"
                                          : task.status === "completed"
                                          ? "bg-green-500"
                                          : task.status === "in_progress"
                                          ? "bg-purple-500"
                                          : "bg-purple-400"
                                      } shadow-lg`}
                                    />
                                    {/* Milestone Progress Badge */}
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                        {task.progress}% Complete
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Task Bar
                                  <div
                                    className={`h-full rounded-lg relative overflow-hidden ${
                                      task.isOnCriticalPath && showCriticalPath
                                        ? "bg-red-500"
                                        : task.status === "completed"
                                        ? "bg-green-500"
                                        : task.status === "in_progress"
                                        ? "bg-blue-500"
                                        : task.status === "on_hold"
                                        ? "bg-amber-500"
                                        : "bg-gray-400"
                                    } shadow-sm`}
                                  >
                                    {/* Progress Fill - Enhanced */}
                                    <div
                                      className="absolute left-0 top-0 h-full transition-all duration-300"
                                      style={{
                                        width: `${task.progress}%`,
                                        background:
                                          task.progress > 0
                                            ? "linear-gradient(90deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)"
                                            : "transparent",
                                      }}
                                    />

                                    {/* Progress Border Indicator */}
                                    {task.progress > 0 &&
                                      task.progress < 100 && (
                                        <div
                                          className="absolute top-0 bottom-0 w-0.5 bg-white bg-opacity-60"
                                          style={{
                                            left: `${task.progress}%`,
                                          }}
                                        />
                                      )}

                                    {/* Progress Text - Enhanced */}
                                    {position.widthPx > 30 && (
                                      <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <span
                                          className={`font-bold drop-shadow-lg ${
                                            position.widthPx > 60
                                              ? "text-xs"
                                              : "text-xs"
                                          } ${
                                            // Use contrasting color based on task status
                                            task.status === "completed"
                                              ? "text-white"
                                              : task.status === "in_progress"
                                              ? "text-white"
                                              : task.status === "on_hold"
                                              ? "text-gray-800"
                                              : task.isOnCriticalPath &&
                                                showCriticalPath
                                              ? "text-white"
                                              : "text-white"
                                          }`}
                                        >
                                          {task.progress}%
                                        </span>
                                      </div>
                                    )}

                                    {/* Small Progress Badge for Narrow Tasks */}
                                    {position.widthPx <= 30 &&
                                      position.widthPx > 15 && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                                          <div className="bg-gray-800 text-white text-xs px-1 py-0.5 rounded shadow-lg">
                                            {task.progress}%
                                          </div>
                                        </div>
                                      )}

                                    {/* Baseline comparison */}
                                    {showBaseline && task.baseline && (
                                      <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gray-400 rounded opacity-60" />
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Task Dependencies Lines */}
                              {task.dependencies.length > 0 && (
                                <div className="absolute top-1/2 transform -translate-y-1/2 -left-2">
                                  <div className="w-2 h-0.5 bg-gray-400"></div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced timeline calculation functions
  const getTimelineColumns = (): TimelineColumn[] => {
    // Always use project dates as the timeline range
    if (!project?.startDate || !project?.endDate) {
      return [];
    }

    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);

    const columns: TimelineColumn[] = [];

    // Helper function to get week number within the year (ISO week)
    const getWeekNumber = (date: Date): number => {
      const d = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
    };

    // Helper function to get the start of week (Monday)
    const getWeekStart = (date: Date): Date => {
      const result = new Date(date);
      const day = result.getDay();
      const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      result.setDate(diff);
      result.setHours(0, 0, 0, 0);
      return result;
    };

    switch (viewMode) {
      case "days":
        const current = new Date(projectStart);
        while (current <= projectEnd) {
          const isWeekend = current.getDay() === 0 || current.getDay() === 6;
          columns.push({
            date: new Date(current),
            label: current.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
            }),
            isWeekend,
          });
          current.setDate(current.getDate() + 1);
        }
        break;

      case "weeks":
        // Start from the week that contains the project start date
        const weekStart = getWeekStart(projectStart);
        const currentWeek = new Date(weekStart);

        while (currentWeek <= projectEnd) {
          const weekNumber = getWeekNumber(currentWeek);
          const monthName = currentWeek.toLocaleDateString("en-US", {
            month: "short",
          });
          const year = currentWeek.getFullYear();

          columns.push({
            date: new Date(currentWeek),
            label: `W${weekNumber} ${monthName} ${year}`,
          });

          currentWeek.setDate(currentWeek.getDate() + 7);
        }
        break;

      case "months":
        const currentMonth = new Date(
          projectStart.getFullYear(),
          projectStart.getMonth(),
          1
        );
        while (currentMonth <= projectEnd) {
          columns.push({
            date: new Date(currentMonth),
            label: currentMonth.toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            }),
          });
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        break;

      case "quarters":
        const currentQuarter = new Date(
          projectStart.getFullYear(),
          Math.floor(projectStart.getMonth() / 3) * 3,
          1
        );
        while (currentQuarter <= projectEnd) {
          const quarter = Math.floor(currentQuarter.getMonth() / 3) + 1;
          columns.push({
            date: new Date(currentQuarter),
            label: `Q${quarter} ${currentQuarter.getFullYear()}`,
          });
          currentQuarter.setMonth(currentQuarter.getMonth() + 3);
        }
        break;
    }

    return columns;
  };

  const calculateTaskPosition = (
    task: GanttTask,
    timelineColumns: TimelineColumn[]
  ) => {
    if (
      timelineColumns.length === 0 ||
      !project?.startDate ||
      !project?.endDate
    ) {
      return { leftPx: 0, widthPx: 0 };
    }

    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    // Fixed column width (must match CSS = 128px)
    const columnWidthPx = 128;
    const totalTimelineWidthPx = timelineColumns.length * columnWidthPx;

    // Calculate task position relative to project timeline
    const projectDuration = projectEnd.getTime() - projectStart.getTime();
    const taskStartOffset = taskStart.getTime() - projectStart.getTime();
    const taskDuration = taskEnd.getTime() - taskStart.getTime();

    // Calculate position and width in pixels - no percentage conversion needed
    const leftPx = Math.max(
      0,
      (taskStartOffset / projectDuration) * totalTimelineWidthPx
    );
    const widthPx = Math.max(
      24,
      (taskDuration / projectDuration) * totalTimelineWidthPx
    ); // Minimum 24px width

    // Debug logging for task positioning (can be removed in production)
    if (task.name.includes("khjgjkgkjhjkgj")) {
      console.log("Task Position Debug:", {
        taskName: task.name,
        taskStart: taskStart.toISOString(),
        taskEnd: taskEnd.toISOString(),
        projectStart: projectStart.toISOString(),
        projectEnd: projectEnd.toISOString(),
        taskDurationDays: Math.ceil(taskDuration / (1000 * 60 * 60 * 24)),
        projectDurationDays: Math.ceil(projectDuration / (1000 * 60 * 60 * 24)),
        timelineColumns: timelineColumns.length,
        totalTimelineWidthPx,
        leftPx,
        widthPx,
      });
    }

    return { leftPx, widthPx };
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
  };

  // Critical path calculation function
  const calculateCriticalPath = async () => {
    setCalculatingCriticalPath(true);
    setCriticalPathError(null);

    try {
      console.log(`🔄 Calculating critical path for project ${projectId}`);

      const response = await fetch(`/api/projects/${projectId}/critical-path`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = await response.json();

      console.log("📊 Critical path calculation result:", result);

      if (result.success) {
        setCriticalPathCalculated(true);
        setCriticalPathError(null);

        console.log(
          "✅ Critical path calculation successful, refreshing data..."
        );

        // Refresh project data to get updated critical path information
        await fetchProjectData();

        console.log(
          "✅ Project data refreshed after critical path calculation"
        );

        // Analyze critical path risks and generate management actions
        analyzeCriticalPathRisks();

        toast.success("Critical path calculated successfully!");
      } else {
        setCriticalPathError(
          result.error || "Failed to calculate critical path"
        );
        toast.error("Failed to calculate critical path");
      }
    } catch (err) {
      console.error("❌ Critical path calculation error:", err);
      setCriticalPathError("Network error occurred");
      toast.error("Network error occurred while calculating critical path");
    } finally {
      setCalculatingCriticalPath(false);
    }
  };

  // Analyze critical path risks and generate management actions
  const analyzeCriticalPathRisks = () => {
    const criticalTasks = tasks.filter((t) => t.isOnCriticalPath);
    console.log("🔍 Analyzing critical path risks for tasks:", criticalTasks);

    const risks: any[] = [];
    const actions: any[] = [];

    if (criticalTasks.length === 0) {
      console.log("⚠️ No critical path tasks found for risk analysis");
      setCriticalPathRisks(risks);
      setCriticalPathActions(actions);
      return;
    }

    // Risk 1: Long duration tasks
    const longDurationTasks = criticalTasks.filter((t) => t.duration > 30);
    if (longDurationTasks.length > 0) {
      risks.push({
        type: "long_duration",
        severity: "high",
        title: "Long Duration Critical Tasks",
        description: `${longDurationTasks.length} critical tasks have duration > 30 days`,
        tasks: longDurationTasks,
        impact: "High risk of project delays",
      });
      actions.push({
        type: "breakdown",
        title: "Break down long tasks",
        description: "Consider splitting tasks longer than 30 days",
        tasks: longDurationTasks,
      });
    }

    // Risk 2: Tasks with no assigned resources
    const unassignedTasks = criticalTasks.filter((t) => {
      const taskId = parseInt(t.id.replace("task-", ""));
      const assignments = resourceAssignments.filter(
        (assignment) => assignment.task_id === taskId
      );
      return (
        assignments.length === 0 ||
        assignments.some(
          (assignment: any) =>
            assignment.resource_name?.includes("Unknown Resource") ||
            assignment.name?.includes("Unknown Resource")
        )
      );
    });
    if (unassignedTasks.length > 0) {
      risks.push({
        type: "unassigned",
        severity: "critical",
        title: "Unassigned Critical Tasks",
        description: `${unassignedTasks.length} critical tasks have no resources assigned`,
        tasks: unassignedTasks,
        impact: "Critical tasks cannot start without resources",
      });
      actions.push({
        type: "assign_resources",
        title: "Assign resources immediately",
        description: "Assign team members to unassigned critical tasks",
        tasks: unassignedTasks,
      });
    }

    // Risk 3: Tasks with low progress (but not completed)
    const lowProgressTasks = criticalTasks.filter(
      (t) => t.progress < 25 && t.status !== "completed" && t.status !== "todo"
    );
    if (lowProgressTasks.length > 0) {
      risks.push({
        type: "low_progress",
        severity: "medium",
        title: "Slow Progress on Critical Tasks",
        description: `${lowProgressTasks.length} critical tasks have low progress (< 25%)`,
        tasks: lowProgressTasks,
        impact: "Risk of missing deadlines",
      });
      actions.push({
        type: "accelerate",
        title: "Accelerate slow tasks",
        description: "Add resources or overtime to accelerate progress",
        tasks: lowProgressTasks,
      });
    }

    // Risk 4: Tasks starting soon (within 7 days)
    const today = new Date();
    const startingSoonTasks = criticalTasks.filter((t) => {
      const startDate = new Date(t.startDate);
      const daysUntilStart = Math.ceil(
        (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilStart <= 7 && daysUntilStart > 0;
    });
    if (startingSoonTasks.length > 0) {
      risks.push({
        type: "starting_soon",
        severity: "medium",
        title: "Critical Tasks Starting Soon",
        description: `${startingSoonTasks.length} critical tasks start within 7 days`,
        tasks: startingSoonTasks,
        impact: "Need immediate attention",
      });
      actions.push({
        type: "prepare",
        title: "Prepare for upcoming tasks",
        description: "Ensure resources and materials are ready",
        tasks: startingSoonTasks,
      });
    }

    // Risk 5: High dependency tasks (more than 2 dependencies)
    const highDependencyTasks = criticalTasks.filter(
      (t) => (t.dependencies || []).length > 2
    );
    if (highDependencyTasks.length > 0) {
      risks.push({
        type: "high_dependencies",
        severity: "high",
        title: "High Dependency Critical Tasks",
        description: `${highDependencyTasks.length} critical tasks have many dependencies`,
        tasks: highDependencyTasks,
        impact: "Risk of cascading delays",
      });
      actions.push({
        type: "monitor_dependencies",
        title: "Monitor dependencies closely",
        description: "Track all dependent tasks to prevent delays",
        tasks: highDependencyTasks,
      });
    }

    // Risk 6: Overdue tasks
    const overdueTasks = criticalTasks.filter((t) => {
      const endDate = new Date(t.endDate);
      return endDate < today && t.status !== "completed";
    });
    if (overdueTasks.length > 0) {
      risks.push({
        type: "overdue",
        severity: "critical",
        title: "Overdue Critical Tasks",
        description: `${overdueTasks.length} critical tasks are overdue`,
        tasks: overdueTasks,
        impact: "Project timeline already impacted",
      });
      actions.push({
        type: "emergency_recovery",
        title: "Emergency recovery plan",
        description: "Implement immediate recovery actions",
        tasks: overdueTasks,
      });
    }

    console.log("📊 Risk analysis results:", { risks, actions });
    setCriticalPathRisks(risks);
    setCriticalPathActions(actions);
  };

  // Run risk analysis when tasks are loaded and critical path data is available
  useEffect(() => {
    if (tasks.length > 0 && !calculatingCriticalPath) {
      const criticalTasks = tasks.filter((t) => t.isOnCriticalPath);
      console.log(
        "🔄 Auto-running risk analysis for existing critical path data"
      );
      console.log("📊 Tasks loaded:", tasks.length);
      console.log("⚡ Critical tasks found:", criticalTasks.length);
      if (criticalTasks.length > 0) {
        console.log("🔍 Running risk analysis...");
        analyzeCriticalPathRisks();
      }
    }
  }, [tasks, calculatingCriticalPath]);

  // Debug effect to log risk analysis results
  useEffect(() => {
    console.log("📈 Risk analysis results updated:");
    console.log("   • Risks:", criticalPathRisks.length);
    console.log("   • Actions:", criticalPathActions.length);
    console.log("   • Should show modal:", criticalPathRisks.length > 0);
  }, [criticalPathRisks, criticalPathActions]);

  // Add this function inside the ProjectGanttPage component
  const handleExportExcel = () => {
    if (!project || tasks.length === 0) {
      toast.error("No project data available for export");
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // 1. Gantt Chart Sheet - Timeline visualization
    const timelineColumns = getTimelineColumns();
    const ganttHeaders = [
      "Task Name",
      "WBS",
      "Start Date",
      "End Date",
      "Duration",
      "Progress (%)",
      "Status",
      "Priority",
      "Assigned To",
      "Milestone",
      "Critical Path",
    ];

    // Add timeline columns to headers
    timelineColumns.forEach((col) => {
      ganttHeaders.push(col.label);
    });

    const ganttData = tasks.map((task) => {
      const row: any = {
        "Task Name": task.name,
        WBS: task.wbsName || "",
        "Start Date": task.startDate.toLocaleDateString(),
        "End Date": task.endDate.toLocaleDateString(),
        Duration: task.duration,
        "Progress (%)": task.progress,
        Status: task.status,
        Priority: task.priority,
        "Assigned To": task.assignedTo.join(", "),
        Milestone: task.isMilestone ? "Yes" : "No",
        "Critical Path": task.isOnCriticalPath ? "Yes" : "No",
      };

      // Add timeline visualization
      timelineColumns.forEach((col) => {
        const taskStart = task.startDate;
        const taskEnd = task.endDate;
        const colDate = col.date;

        if (colDate >= taskStart && colDate <= taskEnd) {
          // Task is active on this date
          if (task.isOnCriticalPath) {
            row[col.label] = "█"; // Critical path task
          } else if (task.isMilestone) {
            row[col.label] = "◆"; // Milestone
          } else {
            row[col.label] = "■"; // Regular task
          }
        } else {
          row[col.label] = "";
        }
      });

      return row;
    });

    // 2. Task Progress Sheet - Detailed task information
    const progressData = tasks.map((task) => ({
      "Task Name": task.name,
      WBS: task.wbsName || "",
      "Start Date": task.startDate.toLocaleDateString(),
      "End Date": task.endDate.toLocaleDateString(),
      "Duration (days)": task.duration,
      "Progress (%)": task.progress,
      Status: task.status,
      Priority: task.priority,
      "Assigned To": task.assignedTo.join(", "),
      Milestone: task.isMilestone ? "Yes" : "No",
      "Critical Path": task.isOnCriticalPath ? "Yes" : "No",
      "Estimated Hours": task.estimatedEffort,
      "Actual Hours": task.actualEffort || 0,
      Cost: task.cost,
      Dependencies: task.dependencies.join(", "),
    }));

    // 3. Project Summary Sheet
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
    const criticalPathTasks = tasks.filter((t) => t.isOnCriticalPath);
    const milestoneTasks = tasks.filter((t) => t.isMilestone);

    const summaryData = [
      { Metric: "Project Name", Value: project.name },
      { Metric: "Total Tasks", Value: tasks.length },
      { Metric: "Completed Tasks", Value: completedTasks.length },
      { Metric: "In Progress Tasks", Value: inProgressTasks.length },
      { Metric: "Critical Path Tasks", Value: criticalPathTasks.length },
      { Metric: "Milestones", Value: milestoneTasks.length },
      { Metric: "Overall Progress (%)", Value: project.progress },
      {
        Metric: "Project Start Date",
        Value: project.startDate.toLocaleDateString(),
      },
      {
        Metric: "Project End Date",
        Value: project.endDate.toLocaleDateString(),
      },
      { Metric: "Project Manager", Value: project.manager },
      { Metric: "Project Budget", Value: project.budget },
    ];

    // 4. Critical Path Analysis Sheet
    const criticalPathData = criticalPathTasks.map((task) => ({
      "Task Name": task.name,
      "Duration (days)": task.duration,
      "Progress (%)": task.progress,
      Status: task.status,
      "Start Date": task.startDate.toLocaleDateString(),
      "End Date": task.endDate.toLocaleDateString(),
      "Assigned To": task.assignedTo.join(", "),
      "Risk Level":
        task.progress < 25 ? "High" : task.progress < 50 ? "Medium" : "Low",
    }));

    // Create sheets
    const ganttSheet = XLSX.utils.json_to_sheet(ganttData);
    const progressSheet = XLSX.utils.json_to_sheet(progressData);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const criticalPathSheet = XLSX.utils.json_to_sheet(criticalPathData);

    // Set column widths for better readability
    const ganttRange = XLSX.utils.decode_range(ganttSheet["!ref"] || "A1");
    for (let col = 0; col <= ganttRange.e.c; col++) {
      const colLetter = XLSX.utils.encode_col(col);
      if (!ganttSheet["!cols"]) ganttSheet["!cols"] = [];
      ganttSheet["!cols"][col] = { width: col < 11 ? 15 : 3 }; // Wider for data columns, narrow for timeline
    }

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, summarySheet, "Project Summary");
    XLSX.utils.book_append_sheet(wb, progressSheet, "Task Progress");
    XLSX.utils.book_append_sheet(wb, ganttSheet, "Gantt Chart");
    XLSX.utils.book_append_sheet(wb, criticalPathSheet, "Critical Path");

    // Export to file
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, "_")}-gantt-chart-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Gantt chart exported to ${fileName}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Project Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The requested project could not be found.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <button
            onClick={() => router.push("/analytics/dashboard")}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Home className="w-4 h-4" />
          </button>
          <span>/</span>
          <button
            onClick={() => router.push("/projects")}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Projects
          </button>
          <span>/</span>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {project.name}
          </button>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {userRole === "executive" ? "Timeline" : "Gantt Chart"}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userRole === "executive"
                ? "Project Timeline"
                : "Project Gantt Chart"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {project.name} - {project.description}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* User Role Display */}
            {user && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium">
                <span>Logged in as: {user.first_name} {user.last_name}</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                  {user.role.name}
                </span>
                {!canEditGantt() && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 rounded text-xs">
                    Read Only
                  </span>
                )}
              </div>
            )}
            {renderRoleSpecificControls()}
          </div>
        </div>

        {/* Project Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Manager
              </label>
              <p className="text-gray-900 dark:text-white">{project.manager}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeline
              </label>
              <p className="text-gray-900 dark:text-white">
                {project.startDate.toLocaleDateString()} -{" "}
                {project.endDate.toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress
              </label>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full"
                    style={{
                      width: `${project.progress}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {project.progress}%
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget
              </label>
              <p className="text-gray-900 dark:text-white">
                OMR {project.budget.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {renderProjectStats()}

        {/* Enhanced Controls */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            {/* Enhanced View Mode */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                View:
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="quarters">Quarters</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
              >
                <option value="all">All Assignees</option>
                {/* Get unique assignees from all tasks */}
                {Array.from(
                  new Set(tasks.flatMap((task) => task.assignedTo))
                ).map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Enhanced Toggle Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCriticalPath}
                  onChange={(e) => setShowCriticalPath(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Critical Path
                </span>
              </label>

              {/* <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showBaseline}
                                    onChange={(e) =>
                                        setShowBaseline(e.target.checked)
                                    }
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Baseline
                                </span>
                            </label> */}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showResourceView}
                  onChange={(e) => setShowResourceView(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Resource View
                </span>
              </label>
            </div>

            {/* Critical Path Calculation Button */}
            <div className="flex gap-2">
              {/* <button
                onClick={calculateCriticalPath}
                disabled={calculatingCriticalPath}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {calculatingCriticalPath ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Calculate Critical Path
                  </>
                )}
              </button> */}

              {/* <button
                onClick={() => {
                  console.log("🔍 Manual risk analysis triggered");
                  analyzeCriticalPathRisks();
                  if (criticalPathRisks.length > 0) {
                    setShowCriticalPathModal(true);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Analyze Risks
              </button> */}

              {/* Debug button to force show modal 
              <button
                onClick={() => {
                  console.log('🔧 Debug: Forcing risk analysis and modal');
                  analyzeCriticalPathRisks();
                  setTimeout(() => {
                    console.log('📊 Current risks:', criticalPathRisks);
                    console.log('📊 Current actions:', criticalPathActions);
                    setShowCriticalPathModal(true);
                  }, 100);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
                Debug Risks
              </button> */}
            </div>

            {/* Critical Path Error Display */}
            {/* {criticalPathError && (
              <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {criticalPathError}
              </div>
            )} */}

            {/* Clear Filters */}
            {(searchTerm ||
              statusFilter !== "all" ||
              assigneeFilter !== "all" ||
              priorityFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setAssigneeFilter("all");
                  setPriorityFilter("all");
                }}
                className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 text-sm"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}

            {/* Export 
            <button className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>*/}
            {/* Add this button to export to Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab("progress")}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "progress"
                    ? "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Project Progress
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "timeline"
                    ? "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Gantt Timeline
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div
              className={`${
                selectedTask || showResourceView
                  ? "lg:col-span-2"
                  : "lg:col-span-3"
              }`}
            >
              {activeTab === "progress"
                ? renderProjectProgressView()
                : renderGanttTimelineView()}
            </div>

            {/* Side Panel */}
            {(selectedTask || showResourceView) && (
              <div className="lg:col-span-1 space-y-6">
                {showResourceView && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Resource Workload
                        </h3>
                        <button
                          onClick={fetchResourceWorkloads}
                          disabled={loadingResourceView}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 text-sm disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Refresh
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      {loadingResourceView ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">
                            Loading resources...
                          </span>
                        </div>
                      ) : resourceWorkloads.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No resource assignments found for this project</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {/* Summary Stats */}
                          {workloadSummary && (
                            <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {workloadSummary.total_resources}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Total Resources
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {workloadSummary.optimal_count}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Optimal
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                  {workloadSummary.overloaded_count}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Overloaded
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                  {workloadSummary.under_utilized_count}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  Under-utilized
                                </div>
                              </div>
                            </div>
                          )}

                          {resourceWorkloads.map((resource) => (
                            <div
                              key={resource.resource_id}
                              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                            >
                              {/* Resource Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                                      resource.status === "overloaded"
                                        ? "bg-red-500"
                                        : resource.status === "under_utilized"
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    }`}
                                  >
                                    {resource.name
                                      .split(" ")
                                      .map((name) => name[0])
                                      .join("")}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {resource.name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {resource.role} • {resource.department}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={`text-lg font-bold ${
                                      resource.status === "overloaded"
                                        ? "text-red-600"
                                        : resource.status === "under_utilized"
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {resource.planned_utilization_rate.toFixed(
                                      1
                                    )}
                                    %
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Planned Utilization
                                  </div>
                                </div>
                              </div>

                              {/* Resource Stats */}
                              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {resource.capacity_hours}h
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400">
                                    Capacity
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {resource.planned_hours.toFixed(1)}h
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400">
                                    Planned
                                  </div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {resource.actual_hours.toFixed(1)}h
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400">
                                    Actual
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bars */}
                              <div className="space-y-3 mb-4">
                                {/* Planned Utilization */}
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Planned Utilization
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {resource.planned_hours.toFixed(1)}h /{" "}
                                      {resource.capacity_hours}h
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        resource.status === "overloaded"
                                          ? "bg-red-500"
                                          : resource.status === "under_utilized"
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          resource.planned_utilization_rate,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Actual Utilization */}
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Actual Progress
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {resource.actual_utilization_rate.toFixed(
                                        1
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div
                                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.min(
                                          resource.actual_utilization_rate,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Status:
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    resource.status === "optimal"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : resource.status === "overloaded"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  }`}
                                >
                                  {resource.status.charAt(0).toUpperCase() +
                                    resource.status.slice(1).replace("_", " ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedTask && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedTask.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTaskEdit(selectedTask)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Task"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleTaskDeleteConfirmation(selectedTask)
                            }
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => setSelectedTask(null)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Close"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {selectedTask.description ||
                              "No description available"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Start Date
                            </label>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {selectedTask.startDate.toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              End Date
                            </label>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {selectedTask.endDate.toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Duration
                            </label>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {selectedTask.duration} days
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Progress
                            </label>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {selectedTask.progress}%
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Assigned To
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTask.assignedTo.map((assignee, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                              >
                                {assignee}
                              </span>
                            ))}
                          </div>
                        </div>

                        {selectedTask.isOnCriticalPath && (
                          <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <Zap className="w-4 h-4 text-red-500 mr-2" />
                            <span className="text-sm text-red-700 dark:text-red-300">
                              This task is on the critical path
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTask}
          wbsItems={wbsItems}
          creating={creating}
          createType={createType}
        />
      )}

      {/* Resource Assignment Modal */}
      {showResourceModal && (
        <ResourceAssignmentModal
          task={selectedTaskForResource}
          resources={resources}
          allTasks={tasks}
          existingAssignments={resourceAssignments}
          onClose={() => {
            setShowResourceModal(false);
            setSelectedTaskForResource(null);
          }}
          onSave={handleResourceAssignment}
        />
      )}

      {/* Resource Detail Modal */}
      {showResourceDetailModal && selectedResourceAssignment && (
        <ResourceDetailModal
          assignment={selectedResourceAssignment}
          onClose={() => {
            setShowResourceDetailModal(false);
            setSelectedResourceAssignment(null);
          }}
          onUpdate={handleResourceAssignmentUpdate}
          onDelete={handleDeleteConfirmation}
          onTaskStatusUpdate={handleTaskStatusUpdate}
        />
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && taskToEdit && (
        <CreateTaskModal
          onClose={() => {
            setShowEditTaskModal(false);
            setTaskToEdit(null);
          }}
          onSave={handleTaskUpdate}
          wbsItems={wbsItems}
          creating={false}
          createType={taskToEdit.isMilestone ? "milestone" : "task"}
          editingTask={taskToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && itemToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Confirm Deletion
                </h2>
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete the {itemToDelete.type} for{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {itemToDelete.name}
                  </span>
                  ?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmedDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Path Management Modal */}
      {showCriticalPathModal && (
        <CriticalPathManagementModal
          risks={criticalPathRisks}
          actions={criticalPathActions}
          onClose={() => setShowCriticalPathModal(false)}
          onAction={(action, tasks) => {
            console.log("Critical path action:", action, tasks);
            // Handle different action types
            switch (action.type) {
              case "assign_resources":
                if (tasks.length > 0) {
                  setSelectedTaskForResource(tasks[0]);
                  setShowResourceModal(true);
                  setShowCriticalPathModal(false);
                  toast.success(
                    `Opening resource assignment for ${tasks[0].name}`
                  );
                }
                break;
              case "breakdown":
                toast.success(
                  `Consider breaking down ${tasks.length} long tasks into smaller subtasks`
                );
                // Could open a task breakdown modal here
                break;
              case "accelerate":
                toast.success(
                  `Add resources or overtime to accelerate ${tasks.length} slow tasks`
                );
                // Could open a resource allocation modal here
                break;
              case "prepare":
                toast.success(
                  `Ensure resources and materials are ready for ${tasks.length} upcoming tasks`
                );
                // Could open a preparation checklist modal here
                break;
              case "monitor_dependencies":
                toast.success(
                  `Track all dependent tasks to prevent delays on ${tasks.length} high-dependency tasks`
                );
                // Could open a dependency monitoring view here
                break;
              case "emergency_recovery":
                toast.error(
                  `EMERGENCY: ${tasks.length} critical tasks are overdue! Implement recovery plan immediately.`
                );
                // Could open an emergency recovery modal here
                break;
              default:
                toast.info(`Action: ${action.title} for ${tasks.length} tasks`);
            }
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default ProjectGanttPage;
