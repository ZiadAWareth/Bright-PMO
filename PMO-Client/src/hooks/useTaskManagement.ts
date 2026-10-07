import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Task } from "@/types/project";



interface UseTaskManagementProps {
    updateWBSProgressAndParents: (wbsId: number) => Promise<void>;
    fetchTasksData: () => Promise<any>;
    canEditSchedule: () => boolean;
}

export const useTaskManagement = ({
    updateWBSProgressAndParents,
    fetchTasksData,
    canEditSchedule,
}: UseTaskManagementProps) => {
    const [creating, setCreating] = useState(false);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreateTask = async (taskData: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to create tasks");
            return null;
        }

        try {
            setCreating(true);
            const wbsResponse = await axios.get(`/api/wbs/${taskData.wbs_id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            const currentWBS = wbsResponse.data;
            const wasCompleted = currentWBS.progress_percentage === 100;
            
            const response = await axios.post("/api/tasks", taskData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
            });
            
            if (response.status === 201) {
                toast.success("Task created successfully!");
                if (wasCompleted) {
                    toast.info("Recalculating WBS progress due to new task addition");
                    await updateWBSProgressAndParents(taskData.wbs_id);
                }
                // Refresh the tasks data
                await fetchTasksData();
                return response.data; // Return the created task object
            }
            return null;
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast.error(error.response?.data?.error || "Failed to create task");
            return null;
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateTask = async (taskData: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to update tasks");
            return;
        }

        try {
            setIsUpdatingTask(true);
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Authentication token missing. Please log in again.");
                return;
            }

            const userRole = localStorage.getItem("userRole") || "project_manager";
            const userId = localStorage.getItem("userId") || "1";

            const sanitizedTaskData = {
                name: taskData.name,
                description: taskData.description,
                wbs_id: taskData.wbs_id,
                start_date: taskData.start_date,
                end_date: taskData.end_date,
                duration: taskData.duration,
                estimated_hours: taskData.estimated_hours,
                work_package: taskData.work_package,
                priority: taskData.priority,
                status: taskData.status,
                is_milestone: taskData.is_milestone,
                progress_percentage: taskData.progress_percentage,
                actual_start_date: taskData.actual_start_date,
                actual_end_date: taskData.actual_end_date,
                actual_hours: taskData.actual_hours,
            };

            const response = await axios.put(
                `/api/tasks/${editingTask?.task_id}`,
                sanitizedTaskData,
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
                toast.success("Task updated successfully!", {
                    description: `Task "${editingTask?.name || "Unknown"}" has been updated.`,
                });
                setShowEditTaskModal(false);
                setEditingTask(null);

                await fetchTasksData();

                if (editingTask) {
                    await updateWBSProgressAndParents(editingTask.wbs_id);
                }
            }
        } catch (error: any) {
            console.error("Error updating task:", error);

            let errorMessage = "Failed to update task";
            let description = "Please check your input and try again.";
            
            if (error.response?.status === 401) {
                errorMessage = "Authentication failed. Please log in again.";
            } else if (error.response?.status === 403) {
                errorMessage = "You do not have permission to update this task.";
            } else if (error.response?.status === 404) {
                errorMessage = "Task not found. It may have been deleted.";
            } else if (error.response?.status === 400) {
                const errorData = error.response.data;
                
                if (errorData?.violations && Array.isArray(errorData.violations) && errorData.violations.length > 0) {
                    errorMessage = errorData.error || "Task dates violate dependency constraints";
                    description = errorData.violations.join(". ");
                    if (errorData.canForce) {
                        description += " You can set 'force: true' to override this validation.";
                    }
                } else if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
                    errorMessage = errorData.error || "Cannot update task status";
                    description = errorData.reasons.join(". ");
                } else {
                    errorMessage = errorData?.error || "Invalid task data provided.";
                }
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            toast.error(errorMessage, {
                description: description,
            });
        } finally {
            setIsUpdatingTask(false);
        }
    };

    const deleteTaskConfirmed = async (taskId: number, wbsId: number) => {
        try {
            const response = await axios.delete(`/api/tasks/${taskId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (response.status === 200) {
                toast.success("Task deleted successfully");
                await updateWBSProgressAndParents(wbsId);
                await fetchTasksData();
            }
        } catch (error: any) {
            console.error("Error deleting task:", error);
            toast.error(error.response?.data?.error || "Failed to delete task");
            throw error;
        }
    };

    const handleEditTask = (task: Task) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to edit tasks");
            return;
        }

        setEditingTask(task);
        setShowEditTaskModal(true);
    };

    return {
        creating,
        isUpdatingTask,
        editingTask,
        showEditTaskModal,
        showCreateModal,
        setCreating,
        setIsUpdatingTask,
        setEditingTask,
        setShowEditTaskModal,
        setShowCreateModal,
        handleCreateTask,
        handleUpdateTask,
        deleteTaskConfirmed,
        handleEditTask,
    };
};