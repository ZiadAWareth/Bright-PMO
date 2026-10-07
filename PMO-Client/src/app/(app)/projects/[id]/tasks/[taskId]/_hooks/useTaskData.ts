"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  getTaskLockStatus,
  canAccessLockedTaskAdminOnly,
} from "@/lib/task-dependency-utils";
import type { Task, TimeLog, FieldDataEntry, Comment, Document } from "../_components/types";

export function useTaskData(params: Promise<{ id: string; taskId: string }>) {
  const router = useRouter();
  const [activeView, setActiveView] = useState("technical");
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [task, setTask] = useState<Task | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Modal states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  // Document upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Comments and documents
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  // Reply states
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isAddingReply, setIsAddingReply] = useState(false);

  // Field data collection
  const [fieldDataEntries, setFieldDataEntries] = useState<FieldDataEntry[]>(
    []
  );
  const [showFieldDataModal, setShowFieldDataModal] = useState(false);
  const [editingFieldData, setEditingFieldData] =
    useState<FieldDataEntry | null>(null);
  const [isSubmittingFieldData, setIsSubmittingFieldData] = useState(false);

  // Resources and team members
  const [availableResources, setAvailableResources] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [projectTeamMembers, setProjectTeamMembers] = useState<any[]>([]);

  // Dependency checking state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isTaskLocked, setIsTaskLocked] = useState(false);
  const [lockReasons, setLockReasons] = useState<string[]>([]);
  const [canAccessLocked, setCanAccessLocked] = useState(false);

  // Role-based access control state
  const [hasTaskAccess, setHasTaskAccess] = useState<boolean | null>(null);

  const canAccessTaskDetails = (
    role: string | null,
    userId: number | null,
    taskData: Task | null
  ) => {
    console.log("=== TASK ACCESS DEBUG START ===");
    console.log("Input parameters:", { role, userId, task: !!taskData });

    if (!role || !userId || !taskData) {
      console.log("Access denied: Missing required parameters", {
        hasRole: !!role,
        hasUserId: !!userId,
        hasTask: !!taskData,
      });
      console.log("=== TASK ACCESS DEBUG END ===");
      return false;
    }

    const adminRoles = [
      "admin",
      "administrator",
      "pjm",
      "project manager",
      "project-manager",
      "pmo",
      "dir",
      "it",
    ];

    const isAdmin = adminRoles.includes(role.toLowerCase());
    console.log("Admin check:", {
      userRole: role,
      roleToLower: role.toLowerCase(),
      adminRoles,
      isAdmin,
    });

    console.log("Assigned users check:");
    console.log("Task assigned_users:", (taskData as any).assigned_users);
    console.log("User ID to match:", userId, typeof userId);

    const isAssignedToTask = (taskData as any).assigned_users?.some(
      (assignedUser: any, index: number) => {
        return assignedUser.user_id === userId;
      }
    );

    console.log("Assignment result:", { isAssignedToTask });

    const finalResult = isAdmin || isAssignedToTask;
    console.log("Final access decision:", {
      isAdmin,
      isAssignedToTask,
      finalResult,
    });
    console.log("=== TASK ACCESS DEBUG END ===");

    return finalResult;
  };

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setProjectId(resolvedParams.id);
      setTaskId(resolvedParams.taskId);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log("=== FETCHING CURRENT USER ===");
        const token = localStorage.getItem("token");
        console.log("Token exists:", !!token);
        if (!token) return;

        const response = await axios.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("User API response:", response.data);

        if (response.data?.user) {
          const userId = response.data.user.user_id;
          const fetchedUserRole = response.data.user.role?.name || null;

          console.log("Setting user data:", {
            userId,
            userIdType: typeof userId,
            userRole: fetchedUserRole,
            userRoleType: typeof fetchedUserRole,
            fullUser: response.data.user,
          });

          setCurrentUserId(userId);
          setUserRole(fetchedUserRole);

          if (response.data.user.account) {
            const firstName = response.data.user.account.first_name || '';
            const lastName = response.data.user.account.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            setCurrentUserName(fullName || response.data.user.username || 'Unknown User');
          } else {
            setCurrentUserName(response.data.user.username || 'Unknown User');
          }
        }
        console.log("=== USER FETCH COMPLETE ===");
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!projectId || !taskId) return;

    const fetchTaskData = async () => {
      setLoading(true);
      try {
        const [
          taskResponse,
          projectResponse,
          resourcesResponse,
          resourceAssignmentsResponse,
        ] = await Promise.all([
          axios.get(`/api/tasks/${taskId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
          axios.get(`/api/projects/${projectId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
          axios.get("/api/resources", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
          axios.get(`/api/tasks/${taskId}/resource-assignments`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
        ]);

        console.log("Task response:", taskResponse.data);

        let documentsResponse;
        try {
          documentsResponse = await axios.get(
            `/api/tasks/${taskId}/documents`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          console.log(documentsResponse.data);
          setDocuments(documentsResponse.data);
        } catch (documentsError) {
          console.error("Error fetching documents:", documentsError);
          documentsResponse = { data: [] };
        }

        const taskData = {
          ...taskResponse.data,
          resource_assignments: resourceAssignmentsResponse.data,
        };

        console.log("=== TASK DATA LOADED ===");
        console.log("Task ID:", taskId);
        console.log("Task basic data:", taskResponse.data);
        console.log("Task assigned_users:", taskResponse.data.assigned_users);
        console.log(
          "Resource assignments response:",
          resourceAssignmentsResponse.data
        );
        console.log("Combined task data:", taskData);
        console.log("Resource assignments details:");
        taskData.resource_assignments?.forEach(
          (assignment: any, index: number) => {
            console.log(`  Assignment ${index}:`, {
              assignmentId: assignment.assignment_id,
              resourceId: assignment.resource?.resource_id,
              resourceName: assignment.resource?.name,
              resourceType: typeof assignment.resource?.resource_id,
            });
          }
        );
        console.log("Assigned users details:");
        taskData.assigned_users?.forEach((assignedUser: any, index: number) => {
          console.log(`  Assigned User ${index}:`, {
            userId: assignedUser.user_id,
            userName: assignedUser.name || assignedUser.username,
            userType: typeof assignedUser.user_id,
          });
        });
        console.log("=== TASK DATA LOADED END ===");

        setTask(taskData);
        setProjectName(projectResponse.data.name);
        setProjectTeamMembers(projectResponse.data.team_members || []);

        if (taskData.successor_dependencies) {
          const lockStatus = getTaskLockStatus(
            taskData.successor_dependencies
          );
          console.log("Task dependency lock status:", lockStatus);
          setIsTaskLocked(lockStatus.isLocked);
          setLockReasons(lockStatus.reasons);
        }

        console.log("Documents API Response:", documentsResponse.data);
        console.log("Documents Response Status:", documentsResponse.status);
        console.log("Task ID for documents:", taskId);

        if (documentsResponse.data && Array.isArray(documentsResponse.data)) {
          setDocuments(documentsResponse.data);
          console.log(
            "Documents set to state:",
            documentsResponse.data.length,
            "documents"
          );
        } else {
          const taskDocuments = taskResponse.data?.documents || [];
          setDocuments(taskDocuments);
          console.log(
            "Using task documents as fallback:",
            taskDocuments.length,
            "documents"
          );
        }

        const currentTaskResourceIds =
          resourceAssignmentsResponse.data.map(
            (assignment: any) => assignment.resource.resource_id
          ) || [];

        console.log("Resources API Response:", resourcesResponse.data);
        console.log(
          "Available Resources:",
          resourcesResponse.data.availableResources
        );

        let availableResourcesArray = [];
        if (resourcesResponse.data.availableResources) {
          availableResourcesArray = resourcesResponse.data.availableResources;
        } else if (Array.isArray(resourcesResponse.data)) {
          availableResourcesArray = resourcesResponse.data;
        } else if (resourcesResponse.data.resources) {
          availableResourcesArray = resourcesResponse.data.resources;
        }

        setAllResources(availableResourcesArray);

        const availableResourceOptions = availableResourcesArray
          .filter(
            (resource: any) =>
              !currentTaskResourceIds.includes(resource.resource_id)
          )
          .map((resource: any) => ({
            value: resource.resource_id.toString(),
            label: `${resource.name} (${resource.role} - ${resource.department})`,
          }));

        console.log("Processed Available Resources:", availableResourceOptions);
        setAvailableResources(availableResourceOptions);

        try {
          const fieldDataResponse = await axios.get(
            `/api/fieldData?task_id=${taskId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          setFieldDataEntries(fieldDataResponse.data || []);
        } catch (error) {
          console.error("Error fetching field data:", error);
          setFieldDataEntries([]);
        }

        try {
          const commentsResponse = await axios.get(
            `/api/tasks/${taskId}/comments`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          setComments(commentsResponse.data.comments || []);
        } catch (error) {
          console.error("Error fetching comments:", error);
          setComments([]);
        }

        setTimeLogs([]);
      } catch (error: any) {
        console.error("Error fetching task data:", error);

        if (error.response?.status === 403 && error.response?.data?.locked) {
          toast.error(
            error.response.data.error || "Access denied to locked task"
          );
          router.push(`/projects/${projectId}/tasks`);
          return;
        }

        toast.error("Failed to load task data");
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [projectId, taskId]);

  useEffect(() => {
    console.log(
      "Role change useEffect triggered. UserRole:",
      userRole,
      "Type:",
      typeof userRole
    );
    if (userRole !== null) {
      console.log(
        "Task details - Checking access for role:",
        userRole,
        typeof userRole
      );
      const accessResult = canAccessLockedTaskAdminOnly(userRole);
      console.log("Task details - Admin access result:", accessResult);
      setCanAccessLocked(accessResult);
      console.log("setCanAccessLocked called with:", accessResult);
    } else {
      console.log("UserRole is null, not updating access");
    }
  }, [userRole]);

  useEffect(() => {
    console.log("=== ACCESS CHECK USEEFFECT ===");
    console.log("Task access check useEffect triggered", {
      userRole,
      userRoleType: typeof userRole,
      currentUserId,
      currentUserIdType: typeof currentUserId,
      hasTask: !!task,
      taskId: task?.task_id,
    });

    if (userRole !== null && currentUserId !== null && task !== null) {
      console.log("All conditions met, calling canAccessTaskDetails...");
      const hasAccess = canAccessTaskDetails(userRole, currentUserId, task);
      console.log("canAccessTaskDetails returned:", hasAccess);
      console.log("Setting task access to:", hasAccess || false);
      setHasTaskAccess(hasAccess || false);
    } else {
      console.log("Conditions not met yet:", {
        userRoleIsNull: userRole === null,
        currentUserIdIsNull: currentUserId === null,
        taskIsNull: task === null,
      });
    }
    console.log("=== ACCESS CHECK USEEFFECT END ===");
  }, [userRole, currentUserId, task]);

  // --- Handler Functions ---

  const submitProgressUpdate = async (data: Record<string, any>) => {
    if (!task) return;

    setIsUpdatingProgress(true);

    try {
      const updateData: any = {
        status: data.status,
        priority: data.priority,
      };

      const response = await axios.put(
        `/api/tasks/${task.task_id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 200) {
        setTask({ ...task, ...response.data } as Task);
        setShowProgressModal(false);
        toast.success("Task status and priority updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating task:", error);
      const errorData = error.response?.data;
      
      if (errorData?.violations && Array.isArray(errorData.violations) && errorData.violations.length > 0) {
        const errorMessage = errorData.error || "Task dates violate dependency constraints";
        const violations = errorData.violations.join(". ");
        toast.error(errorMessage, {
          description: violations + (errorData.canForce ? " You can set 'force: true' to override." : "")
        });
      } else if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
        const errorMessage = errorData.error || "Cannot update task status";
        const reasons = errorData.reasons.join(". ");
        toast.error(`${errorMessage}: ${reasons}`);
      } else {
        toast.error(errorData?.error || "Failed to update task");
      }
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const submitTimeLog = async (data: Record<string, any>) => {
    setIsLoggingTime(true);

    try {
      const newTimeLog: TimeLog = {
        id: Date.now(),
        hours: parseFloat(data.hours),
        description: data.description,
        date: data.date,
        user_name: "Current User",
      };

      setTimeLogs([newTimeLog, ...timeLogs]);
      setShowTimeLogModal(false);
      toast.success("Time logged successfully");
    } catch (error) {
      console.error("Error logging time:", error);
      toast.error("Failed to log time");
    } finally {
      setIsLoggingTime(false);
    }
  };

  const handleCreateFieldData = async (data: any) => {
    if (!task) return;

    setIsSubmittingFieldData(true);

    try {
      const response = await axios.post(
        "/api/fieldData",
        {
          task_id: task.task_id,
          resource_assignment_id: data.resource_assignment_id,
          actual_progress:
            typeof data.actual_progress === "string"
              ? parseFloat(data.actual_progress)
              : data.actual_progress,
          actual_hours:
            typeof data.actual_hours === "string"
              ? parseFloat(data.actual_hours)
              : data.actual_hours,
          notes: data.notes || "",
          is_according_to_plan: data.is_according_to_plan,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 201) {
        const fieldDataResponse = await axios.get(
          `/api/fieldData?task_id=${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const taskResponse = await axios.get(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const resourceAssignmentsResponse = await axios.get(
          `/api/tasks/${taskId}/resource-assignments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setFieldDataEntries(fieldDataResponse.data || []);
        const updatedTask = {
          ...task,
          ...taskResponse.data,
          resource_assignments: resourceAssignmentsResponse.data,
        };
        setTask(updatedTask);
        setShowFieldDataModal(false);
        setEditingFieldData(null);
        if (
          updatedTask.progress_percentage >= 100 &&
          updatedTask.status === "completed" &&
          task &&
          task.progress_percentage < 100
        ) {
          toast.success("🎉 Task automatically completed! Great work!", {
            duration: 5000,
          });
        } else {
          const hoursAdded =
            typeof data.actual_hours === "string"
              ? parseFloat(data.actual_hours)
              : data.actual_hours;

          const assignment = task?.resource_assignments?.find(
            (a) => a.assignment_id === data.resource_assignment_id
          );

          if (hoursAdded > 0 && assignment) {
            const costAdded = hoursAdded * assignment.resource.rate;
            toast.success(
              `✅ Field data created! Added ${hoursAdded}h (+$${costAdded.toFixed(
                2
              )}) to task cost. Cost updates properly cascaded to WBS and project levels.`,
              { duration: 6000 }
            );
          } else {
            toast.success("Field data entry created successfully");
          }
        }
      }
    } catch (error: any) {
      console.error("Error creating field data entry:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create field data entry";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingFieldData(false);
    }
  };

  const handleUpdateFieldData = async (data: any) => {
    if (!editingFieldData) return;

    setIsSubmittingFieldData(true);

    try {
      const response = await axios.put(
        `/api/fieldData/${editingFieldData.id}`,
        {
          resource_assignment_id: data.resource_assignment_id,
          actual_progress:
            typeof data.actual_progress === "string"
              ? parseFloat(data.actual_progress)
              : data.actual_progress,
          actual_hours:
            typeof data.actual_hours === "string"
              ? parseFloat(data.actual_hours)
              : data.actual_hours,
          notes: data.notes || "",
          is_according_to_plan: data.is_according_to_plan,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 200) {
        const fieldDataResponse = await axios.get(
          `/api/fieldData?task_id=${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const taskResponse = await axios.get(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const resourceAssignmentsResponse = await axios.get(
          `/api/tasks/${taskId}/resource-assignments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setFieldDataEntries(fieldDataResponse.data || []);
        const updatedTask = {
          ...task,
          ...taskResponse.data,
          resource_assignments: resourceAssignmentsResponse.data,
        };
        setTask(updatedTask);
        setShowFieldDataModal(false);
        setEditingFieldData(null);

        if (
          updatedTask.progress_percentage >= 100 &&
          updatedTask.status === "completed" &&
          task &&
          task.progress_percentage < 100
        ) {
          toast.success("🎉 Task automatically completed! Great work!", {
            duration: 5000,
          });
        } else {
          const newHours =
            typeof data.actual_hours === "string"
              ? parseFloat(data.actual_hours)
              : data.actual_hours;
          const oldHours = editingFieldData.actual_hours;
          const hoursChange = newHours - oldHours;

          const assignment = task?.resource_assignments?.find(
            (a) => a.assignment_id === data.resource_assignment_id
          );

          if (hoursChange !== 0 && assignment) {
            const costChange = hoursChange * assignment.resource.rate;
            toast.success(
              `✅ Field data updated! ${
                hoursChange > 0 ? "+" : ""
              }${hoursChange.toFixed(1)}h (${
                costChange >= 0 ? "+" : ""
              }$${costChange.toFixed(
                2
              )}) cost impact. WBS and project costs accurately updated.`,
              { duration: 5000 }
            );
          } else {
            toast.success("Field data entry updated successfully");
          }
        }
      }
    } catch (error: any) {
      console.error("Error updating field data entry:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to update field data entry";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingFieldData(false);
    }
  };

  const handleDeleteFieldData = async (fieldDataId: number) => {
    try {
      const response = await axios.delete(`/api/fieldData/${fieldDataId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.status === 200) {
        const fieldDataResponse = await axios.get(
          `/api/fieldData?task_id=${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const taskResponse = await axios.get(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const resourceAssignmentsResponse = await axios.get(
          `/api/tasks/${taskId}/resource-assignments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setFieldDataEntries(fieldDataResponse.data || []);
        const updatedTask = {
          ...task,
          ...taskResponse.data,
          resource_assignments: resourceAssignmentsResponse.data,
        };
        setTask(updatedTask);

        if (
          updatedTask.progress_percentage >= 100 &&
          updatedTask.status === "completed" &&
          task &&
          task.progress_percentage < 100
        ) {
          toast.success("🎉 Task automatically completed! Great work!", {
            duration: 5000,
          });
        } else {
          toast.success("Field data entry deleted successfully");
        }
      }
    } catch (error: any) {
      console.error("Error deleting field data entry:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to delete field data entry";
      toast.error(errorMessage);
    }
  };

  const handleResourceAssign = async (data: any) => {
    if (!task) return;

    try {
      const response = await axios.post("/api/resourceAssignments", data, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.status === 201) {
        const resourceAssignmentsResponse = await axios.get(
          `/api/tasks/${taskId}/resource-assignments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setTask({
          ...task,
          resource_assignments: resourceAssignmentsResponse.data,
        } as Task);

        setShowResourceModal(false);

        toast.success("Resource assigned to task successfully");
      }
    } catch (error: any) {
      console.error("Error assigning resource:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to assign resource to task";
      toast.error(errorMessage);
    }
  };

  const handleUnassignResource = async (assignmentId: number) => {
    if (!task) return;

    try {
      const response = await axios.delete(
        `/api/resourceAssignments/${assignmentId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 200) {
        const resourceAssignmentsResponse = await axios.get(
          `/api/tasks/${taskId}/resource-assignments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setTask({
          ...task,
          resource_assignments: resourceAssignmentsResponse.data,
        } as Task);

        const currentTaskResourceIds =
          resourceAssignmentsResponse.data.map(
            (assignment: any) => assignment.resource.resource_id
          ) || [];
        const resourcesResponse = await axios.get("/api/resources", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const availableResourceOptions =
          resourcesResponse.data.availableResources
            .filter(
              (resource: any) =>
                !currentTaskResourceIds.includes(resource.resource_id)
            )
            .map((resource: any) => ({
              value: resource.resource_id.toString(),
              label: `${resource.name} (${resource.role} - ${resource.department})`,
            }));

        setAvailableResources(availableResourceOptions);
        toast.success("Resource unassigned from task successfully");
      }
    } catch (error: any) {
      console.error("Error unassigning resource:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to unassign resource from task";
      toast.error(errorMessage);
    }
  };

  const handleEditAssignment = async (updatedAssignment: any) => {
    if (!task) return;

    try {
      const response = await axios.put(
        `/api/resourceAssignments/${updatedAssignment.assignment_id}`,
        updatedAssignment,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 200) {
        const resourceAssignmentsResponse = await axios.get(
          `/api/tasks/${taskId}/resource-assignments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setTask({
          ...task,
          resource_assignments: resourceAssignmentsResponse.data,
        } as Task);

        setShowEditModal(false);
        setSelectedAssignment(null);
        toast.success("Resource assignment updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating resource assignment:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to update resource assignment";
      toast.error(errorMessage);
    }
  };

  const handleTaskStatusUpdateFromModal = async (
    modalTaskId: string,
    newStatus: string
  ) => {
    if (!task) return;

    try {
      const response = await axios.put(
        `/api/tasks/${task.task_id}`,
        {
          status: newStatus,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 200) {
        setTask({ ...task, status: newStatus } as Task);
        toast.success("Task status updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating task status:", error);
      const errorData = error.response?.data;
      if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
        const errorMessage = errorData.error || "Cannot update task status";
        const reasons = errorData.reasons.join(". ");
        toast.error(`${errorMessage}: ${reasons}`);
      } else {
        toast.error(errorData?.error || "Failed to update task status");
      }
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !task) return;

    setIsAddingComment(true);

    try {
      const response = await axios.post(
        `/api/tasks/${task.task_id}/comments`,
        {
          message: newComment,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 201) {
        const commentsResponse = await axios.get(
          `/api/tasks/${task.task_id}/comments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setComments(commentsResponse.data.comments || []);
        setNewComment("");
        toast.success("Comment added successfully");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  const addReply = async (parentId: number) => {
    if (!replyText.trim() || !task) return;

    setIsAddingReply(true);

    try {
      const response = await axios.post(
        `/api/tasks/${task.task_id}/comments`,
        {
          message: replyText,
          parent_id: parentId,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 201) {
        const commentsResponse = await axios.get(
          `/api/tasks/${task.task_id}/comments`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setComments(commentsResponse.data.comments || []);
        setReplyText("");
        setReplyingTo(null);
        toast.success("Reply added successfully");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    } finally {
      setIsAddingReply(false);
    }
  };

  const handleReplyClick = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyText("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const handleFileSelect = (
    files: FileList | null,
    inputElement?: HTMLInputElement
  ) => {
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setUploadFiles(newFiles);
      setShowUploadModal(true);

      if (inputElement) {
        inputElement.value = "";
      }
    }
  };

  const handleUploadDocument = async () => {
    if (!task || uploadFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setIsUploading(true);

    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("task_id", task.task_id.toString());
        formData.append(
          "description",
          uploadDescription || `Task document: ${file.name}`
        );

        const response = await axios.post(
          "/api/documents/uploadFile",
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (response.status === 200) {
          toast.success(`${file.name} uploaded successfully`);
        }
      }

      const documentsResponse = await axios.get(
        `/api/tasks/${taskId}/documents`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      console.log("Documents refresh response:", documentsResponse.data);
      setDocuments(documentsResponse.data || []);
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadDescription("");
    } catch (error: any) {
      console.error("Error uploading files:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to upload files";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = (doc: Document) => {
    try {
      if (doc.document_id) {
        window.open(`/api/documents/download?documentId=${doc.document_id}`, "_blank");
        return;
      }
      toast.error("Document path not available for viewing");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to open document");
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const response = await axios.get(
        `/api/documents/download?documentId=${doc.document_id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const originalName =
        doc.name.includes("_v") && doc.version > 1
          ? doc.name.substring(0, doc.name.lastIndexOf("_v")) +
            doc.name.substring(doc.name.lastIndexOf("."))
          : doc.name;

      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Document downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading document:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to download document";
      toast.error(errorMessage);
    }
  };

  const handleDeleteDocument = (doc: Document) => {
    setDocumentToDelete(doc);
    setShowDeleteDocumentModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      const response = await axios.delete(
        `/api/documents/${documentToDelete.document_id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      if (response.status === 200) {
        const documentsResponse = await axios.get(
          `/api/tasks/${taskId}/documents`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        console.log("Documents refresh after delete:", documentsResponse.data);
        setDocuments(documentsResponse.data || []);
        setShowDeleteDocumentModal(false);
        setDocumentToDelete(null);
        toast.success("Document deleted successfully");
      }
    } catch (error: any) {
      console.error("Error deleting document:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to delete document";
      toast.error(errorMessage);
    }
  };

  return {
    router,
    activeView, setActiveView,
    loading,
    projectId,
    taskId,
    task, setTask,
    projectName,
    currentUserId,
    showProgressModal, setShowProgressModal,
    showTimeLogModal, setShowTimeLogModal,
    showResourceModal, setShowResourceModal,
    showEditModal, setShowEditModal,
    showDeleteDocumentModal, setShowDeleteDocumentModal,
    selectedAssignment, setSelectedAssignment,
    documentToDelete, setDocumentToDelete,
    isUpdatingProgress,
    isLoggingTime,
    showUploadModal, setShowUploadModal,
    uploadFiles, setUploadFiles,
    uploadDescription, setUploadDescription,
    isUploading,
    comments,
    documents,
    timeLogs,
    newComment, setNewComment,
    isAddingComment,
    currentUserName,
    replyingTo,
    replyText, setReplyText,
    isAddingReply,
    fieldDataEntries,
    showFieldDataModal, setShowFieldDataModal,
    editingFieldData, setEditingFieldData,
    isSubmittingFieldData,
    availableResources,
    allResources,
    projectTeamMembers,
    userRole,
    isTaskLocked,
    lockReasons,
    canAccessLocked,
    hasTaskAccess,
    // Handler functions
    submitProgressUpdate,
    submitTimeLog,
    handleCreateFieldData,
    handleUpdateFieldData,
    handleDeleteFieldData,
    handleResourceAssign,
    handleUnassignResource,
    handleEditAssignment,
    handleTaskStatusUpdateFromModal,
    addComment,
    addReply,
    handleReplyClick,
    cancelReply,
    handleFileSelect,
    handleUploadDocument,
    handleViewDocument,
    handleDownloadDocument,
    handleDeleteDocument,
    confirmDeleteDocument,
  };
}
