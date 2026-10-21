import { useState } from "react";
import { toast } from "sonner";
import { Task } from "@/features/projects/types";
import { notConnected } from "@/lib/not-connected";

interface UseTaskManagementProps {
    updateWBSProgressAndParents: (wbsId: number) => Promise<void>;
    fetchTasksData: () => Promise<any>;
    canEditSchedule: () => boolean;
}

/**
 * Task create/edit/delete state for the schedule screen.
 *
 * notConnected: creating, updating and deleting a task would save on the
 * backend and then refresh the tasks and the WBS progress. Until then those
 * actions report that they are not connected; the modal state works as before.
 */
export const useTaskManagement = ({
    canEditSchedule,
}: UseTaskManagementProps) => {
    const [creating, setCreating] = useState(false);
    const [isUpdatingTask, setIsUpdatingTask] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreateTask = async (_taskData: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to create tasks");
            return null;
        }
        notConnected("Creating a task");
        return null;
    };

    const handleUpdateTask = async (_taskData: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to update tasks");
            return;
        }
        notConnected("Updating the task");
    };

    const deleteTaskConfirmed = async (_taskId: number, _wbsId: number) => {
        notConnected("Deleting the task");
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
