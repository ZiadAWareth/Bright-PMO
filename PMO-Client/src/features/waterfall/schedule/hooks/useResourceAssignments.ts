import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Task } from "@/features/projects/types";
import { notConnected } from "@/lib/not-connected";

interface UseResourceAssignmentsProps {
    tasks: Task[];
    checkAndUpdateTaskCompletion: (taskId: number) => Promise<void>;
    canEditSchedule: () => boolean;
}

/**
 * Resource assignment state for the schedule screen.
 *
 * notConnected: the resource list and each task's assignments would be loaded
 * from the backend, and assigning, editing, re-hours and removing would save
 * there. Until then the lists come only from the tasks passed in (empty), and
 * those actions report that they are not connected. The modal and inline-edit
 * state work as before.
 */
export const useResourceAssignments = ({
    tasks,
    canEditSchedule,
}: UseResourceAssignmentsProps) => {
    const [resources, setResources] = useState<any[]>([]);
    const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
    const [allTaskAssignments, setAllTaskAssignments] = useState<Record<number, any[]>>({});
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [updatingHours] = useState<Record<number, boolean>>({});
    const [localHoursValues, setLocalHoursValues] = useState<Record<number, number>>({});
    const [hoursTimeouts, setHoursTimeouts] = useState<Record<number, NodeJS.Timeout>>({});
    const [resourceAssignmentModalOpen, setResourceAssignmentModalOpen] = useState(false);
    const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);
    const [editingAssignment, setEditingAssignment] = useState<any>(null);
    const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);

    useEffect(() => {
        if (tasks.length === 0) return;
        const map: Record<number, any[]> = {};
        for (const task of tasks) {
            map[task.task_id] = (task as any).resourceAssignments ?? [];
        }
        setAllTaskAssignments(map);
    }, [tasks]);

    useEffect(() => {
        return () => {
            Object.values(hoursTimeouts).forEach((timeout) => {
                if (timeout) clearTimeout(timeout);
            });
        };
    }, [hoursTimeouts]);

    const fetchTaskAssignments = async (taskId: number): Promise<any[]> =>
        allTaskAssignments[taskId] ?? [];

    const fetchAllTaskAssignments = async () => {
        // notConnected: reloads every task's assignments.
    };

    const handleResourceAssignment = async (_assignmentData: any) => {
        notConnected("Assigning a resource");
    };

    const handleInlineHoursUpdate = async (
        _assignmentId: number,
        _newHours: number,
        _plannedHours: number,
        _taskId: number
    ) => {
        notConnected("Updating actual hours");
    };

    const handleHoursInputChange = (
        assignmentId: number,
        value: string,
        plannedHours: number,
        taskId: number
    ) => {
        const newHours = parseFloat(value) || 0;

        setLocalHoursValues((prev) => ({ ...prev, [assignmentId]: newHours }));

        if (hoursTimeouts[assignmentId]) {
            clearTimeout(hoursTimeouts[assignmentId]);
        }

        const timeout = setTimeout(() => {
            handleInlineHoursUpdate(assignmentId, newHours, plannedHours, taskId);
            setHoursTimeouts((prev) => {
                const newTimeouts = { ...prev };
                delete newTimeouts[assignmentId];
                return newTimeouts;
            });
        }, 2000);

        setHoursTimeouts((prev) => ({ ...prev, [assignmentId]: timeout }));
    };

    const openResourceAssignmentModal = async (task: Task) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to assign resources");
            return;
        }

        setSelectedTaskForAssignment(task);
        setTaskAssignments(await fetchTaskAssignments(task.task_id));
        setResourceAssignmentModalOpen(true);
    };

    const handleEditAssignment = (assignment: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to edit assignments");
            return;
        }

        setEditingAssignment(assignment);
        setShowEditAssignmentModal(true);
    };

    const handleUpdateAssignment = async (_assignmentData: any) => {
        notConnected("Updating the assignment");
    };

    const deleteAssignmentConfirmed = async (_assignmentId: number, _taskId: number) => {
        notConnected("Removing the assignment");
    };

    return {
        resources,
        taskAssignments,
        allTaskAssignments,
        loadingAssignments,
        updatingHours,
        localHoursValues,
        resourceAssignmentModalOpen,
        selectedTaskForAssignment,
        editingAssignment,
        showEditAssignmentModal,
        setResources,
        setTaskAssignments,
        setAllTaskAssignments,
        setLoadingAssignments,
        setResourceAssignmentModalOpen,
        setSelectedTaskForAssignment,
        setEditingAssignment,
        setShowEditAssignmentModal,
        fetchTaskAssignments,
        fetchAllTaskAssignments,
        handleResourceAssignment,
        handleHoursInputChange,
        handleInlineHoursUpdate,
        openResourceAssignmentModal,
        handleEditAssignment,
        handleUpdateAssignment,
        deleteAssignmentConfirmed,
    };
};
