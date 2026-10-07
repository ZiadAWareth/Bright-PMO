import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Task } from "@/types/project";

interface UseResourceAssignmentsProps {
    tasks: Task[];
    checkAndUpdateTaskCompletion: (taskId: number) => Promise<void>;
    canEditSchedule: () => boolean;
}

export const useResourceAssignments = ({
    tasks,
    checkAndUpdateTaskCompletion,
    canEditSchedule,
}: UseResourceAssignmentsProps) => {
    const [resources, setResources] = useState<any[]>([]);
    const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
    const [allTaskAssignments, setAllTaskAssignments] = useState<Record<number, any[]>>({});
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [updatingHours, setUpdatingHours] = useState<Record<number, boolean>>({});
    const [localHoursValues, setLocalHoursValues] = useState<Record<number, number>>({});
    const [hoursTimeouts, setHoursTimeouts] = useState<Record<number, NodeJS.Timeout>>({});
    const [resourceAssignmentModalOpen, setResourceAssignmentModalOpen] = useState(false);
    const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<Task | null>(null);
    const [editingAssignment, setEditingAssignment] = useState<any>(null);
    const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);

    useEffect(() => {
        fetchResources();
    }, []);

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

    const fetchResources = async () => {
        try {
            const response = await axios.get("/api/resources", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setResources(response.data.allResources || []);
        } catch (error) {
            console.error("Error fetching resources:", error);
            toast.error("Failed to load resources");
        }
    };

    const fetchTaskAssignments = async (taskId: number) => {
        try {
            const response = await axios.get(
                `/api/tasks/${taskId}/resource-assignments`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error(`Error fetching task assignments for task ${taskId}:`, error);
            return [];
        }
    };

    const fetchAllTaskAssignments = async () => {
        try {
            setLoadingAssignments(true);
            const assignmentsMap: Record<number, any[]> = {};

            for (const task of tasks) {
                const assignments = await fetchTaskAssignments(task.task_id);
                assignmentsMap[task.task_id] = assignments;
            }

            setAllTaskAssignments(assignmentsMap);
            setLoadingAssignments(false);
        } catch (error) {
            console.error("Error fetching all task assignments:", error);
            setLoadingAssignments(false);
        }
    };

    const handleResourceAssignment = async (assignmentData: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to assign resources");
            return;
        }

        try {
            const response = await axios.post(
                "/api/resourceAssignments",
                assignmentData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 201) {
                toast.success("Resource assigned successfully");
                setResourceAssignmentModalOpen(false);
                setSelectedTaskForAssignment(null);
                
                const updatedAssignments = await fetchTaskAssignments(assignmentData.task_id);
                setTaskAssignments(updatedAssignments);
                setAllTaskAssignments((prev) => ({
                    ...prev,
                    [assignmentData.task_id]: updatedAssignments,
                }));

                await checkAndUpdateTaskCompletion(assignmentData.task_id);
            }
        } catch (error: any) {
            console.error("Error assigning resource:", error);
            if (error.response?.status === 400) {
                const errorData = error.response.data;

                if (errorData.reason === "resource_not_available") {
                    toast.error("Resource is not available for assignments");
                } else if (errorData.reason === "capacity_exceeded") {
                    toast.error("Resource capacity exceeded for this time period");
                } else if (errorData.conflictDetails) {
                    toast.error("Resource has conflicting assignments during this period");
                    if (errorData.alternatives && errorData.alternatives.length > 0) {
                        toast.info(`${errorData.alternatives.length} alternative resources available`);
                    }
                } else if (errorData.details) {
                    if (errorData.details.plannedHours && errorData.details.requiredHours) {
                        toast.error(
                            `Planned hours (${errorData.details.plannedHours}) exceed available time (${errorData.details.requiredHours} hours)`
                        );
                    } else if (errorData.details.capacity) {
                        toast.error(`Resource capacity insufficient: ${errorData.details.capacity}h/day`);
                    } else {
                        toast.error(errorData.error || "Resource assignment validation failed");
                    }
                } else {
                    toast.error(errorData.error || "Resource assignment failed");
                }

                if (errorData.alternatives && errorData.alternatives.length > 0) {
                    console.log("Alternative resources:", errorData.alternatives);
                    toast.info(`${errorData.alternatives.length} alternative resources suggested`);
                }
            } else {
                toast.error("Failed to assign resource");
            }
        }
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

    const handleInlineHoursUpdate = async (
        assignmentId: number,
        newHours: number,
        plannedHours: number,
        taskId: number
    ) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to update hours");
            return;
        }

        if (isNaN(newHours) || newHours < 0) {
            toast.error("Please enter a valid number of hours");
            return;
        }

        setUpdatingHours((prev) => ({ ...prev, [assignmentId]: true }));

        try {
            const currentAssignmentResponse = await axios.get(
                `/api/resourceAssignments/${assignmentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            const currentAssignment = currentAssignmentResponse.data;

            if (currentAssignment.actual_hours === newHours) {
                setUpdatingHours((prev) => ({ ...prev, [assignmentId]: false }));
                return;
            }

            const response = await axios.put(
                `/api/resourceAssignments/${assignmentId}`,
                {
                    ...currentAssignment,
                    actual_hours: newHours,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 200) {
                if (newHours >= plannedHours && currentAssignment.actual_hours < plannedHours) {
                    toast.success(`🎉 Assignment completed! ${newHours}h recorded`);
                }

                setLocalHoursValues((prev) => {
                    const newValues = { ...prev };
                    delete newValues[assignmentId];
                    return newValues;
                });

                setAllTaskAssignments((prev) => ({
                    ...prev,
                    [taskId]: prev[taskId]?.map((assignment) =>
                        assignment.assignment_id === assignmentId
                            ? { ...assignment, actual_hours: newHours }
                            : assignment
                    ) || [],
                }));

                await checkAndUpdateTaskCompletion(taskId);
                await fetchAllTaskAssignments();
            }
        } catch (error: any) {
            console.error("Error updating actual hours:", error);
            toast.error(error.response?.data?.error || "Failed to update actual hours");
        } finally {
            setUpdatingHours((prev) => ({ ...prev, [assignmentId]: false }));
        }
    };

    const openResourceAssignmentModal = async (task: Task) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to assign resources");
            return;
        }

        setSelectedTaskForAssignment(task);
        const assignments = await fetchTaskAssignments(task.task_id);
        setTaskAssignments(assignments);
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

    const handleUpdateAssignment = async (assignmentData: any) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to update assignments");
            return;
        }

        try {
            const response = await axios.put(
                `/api/resourceAssignments/${editingAssignment?.assignment_id}`,
                assignmentData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 200) {
                toast.success("Resource assignment updated successfully!");
                setShowEditAssignmentModal(false);
                setEditingAssignment(null);
                await fetchAllTaskAssignments();
                if (editingAssignment) {
                    await checkAndUpdateTaskCompletion(editingAssignment.task_id);
                }
            }
        } catch (error: any) {
            console.error("Error updating assignment:", error);
            toast.error(error.response?.data?.error || "Failed to update assignment");
        }
    };

    const deleteAssignmentConfirmed = async (assignmentId: number, taskId: number) => {
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
                await fetchAllTaskAssignments();
                await checkAndUpdateTaskCompletion(taskId);
            }
        } catch (error: any) {
            console.error("Error deleting assignment:", error);
            toast.error(error.response?.data?.error || "Failed to delete assignment");
        }
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