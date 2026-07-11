import axios from "axios";
import { toast } from "sonner";

interface UseWBSProgressProps {
    projectId: string;
}

export const useWBSProgress = ({ projectId }: UseWBSProgressProps) => {
    const updateWBSProgressAndParents = async (wbsId: number) => {
        try {
            const wbsResponse = await axios.get(`/api/wbs/${wbsId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            const currentWBS = wbsResponse.data;

            const tasksResponse = await axios.get(`/api/wbs/${wbsId}/tasks`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            const wbsTasks = tasksResponse.data;

            let progressPercentage = 0;
            if (wbsTasks.length > 0) {
                const completedTasks = wbsTasks.filter(
                    (task: any) => task.status === "completed"
                ).length;
                progressPercentage = Math.round((completedTasks / wbsTasks.length) * 100);

                console.log(
                    `Updated WBS "${currentWBS.name}" progress to ${progressPercentage}% (${completedTasks}/${wbsTasks.length} tasks completed)`
                );
            } else {
                const childWBSResponse = await axios.get(
                    `/api/projects/${projectId}/wbs`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                    }
                );

                const allWBS = childWBSResponse.data;
                const childWBSItems = allWBS.filter(
                    (wbs: any) => wbs.parent_wbs_id === wbsId
                );

                if (childWBSItems.length > 0) {
                    const completedChildWBS = childWBSItems.filter(
                        (wbs: any) => wbs.progress_percentage === 100
                    ).length;
                    progressPercentage = Math.round(
                        (completedChildWBS / childWBSItems.length) * 100
                    );

                    console.log(
                        `Updated WBS "${currentWBS.name}" progress to ${progressPercentage}% (${completedChildWBS}/${childWBSItems.length} child WBS completed)`
                    );
                }
            }

            await axios.put(
                `/api/wbs/${wbsId}`,
                {
                    progress_percentage: progressPercentage,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            toast.success(
                `WBS progress updated with cascading parent updates! "${currentWBS.name}" → ${progressPercentage}%`
            );
        } catch (error) {
            console.error("Error updating WBS progress:", error);
            toast.error("Failed to update WBS progress");
        }
    };

    const checkAndUpdateTaskCompletion = async (taskId: number) => {
        try {
            const taskResponse = await axios.get(`/api/tasks/${taskId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            const currentTask = taskResponse.data;

            const assignmentsResponse = await axios.get(
                `/api/tasks/${taskId}/resource-assignments`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            const assignments = assignmentsResponse.data;

            let newStatus = currentTask.status;
            let newProgress = currentTask.progress_percentage;
            let actualEndDate = currentTask.actual_end_date;
            let shouldUpdate = false;

            if (assignments.length === 0) {
                if (currentTask.status === "completed" && currentTask.actual_end_date) {
                    newStatus = "todo";
                    newProgress = 0;
                    actualEndDate = null;
                    shouldUpdate = true;
                    toast.info("Task status reset due to removed assignments");
                }
            } else {
                let totalWeightedHours = 0;
                let totalPossibleWeightedHours = 0;

                assignments.forEach((assignment: any) => {
                    const allocation = assignment.allocation_percentage / 100;
                    const actualHours = assignment.actual_hours || 0;
                    const plannedHours = assignment.planned_hours || 0;

                    const weightedActualHours = actualHours * allocation;
                    totalWeightedHours += weightedActualHours;

                    const weightedPlannedHours = plannedHours * allocation;
                    totalPossibleWeightedHours += weightedPlannedHours;
                });

                if (totalPossibleWeightedHours > 0) {
                    newProgress = Math.min(
                        100,
                        Math.round((totalWeightedHours / totalPossibleWeightedHours) * 100)
                    );
                } else {
                    newProgress = 0;
                }

                const allAssignmentsCompleted = assignments.every(
                    (assignment: any) => assignment.actual_hours >= assignment.planned_hours
                );

                if (allAssignmentsCompleted && assignments.length > 0) {
                    newStatus = "completed";
                    newProgress = 100;
                    actualEndDate = actualEndDate || new Date().toISOString();
                    shouldUpdate = currentTask.status !== "completed";

                    if (shouldUpdate) {
                        toast.success("Task marked as completed!");
                    }
                } else {
                    if (newProgress > 0 && newProgress < 100) {
                        newStatus = "in_progress";
                        actualEndDate = null;
                        shouldUpdate =
                            currentTask.status !== "in_progress" ||
                            currentTask.progress_percentage !== newProgress;
                    } else if (newProgress === 0) {
                        newStatus = "todo";
                        actualEndDate = null;
                        shouldUpdate =
                            currentTask.status !== "todo" ||
                            currentTask.progress_percentage !== 0;
                    }
                }
            }

            if (shouldUpdate) {
                const taskUpdate = {
                    name: currentTask.name,
                    description: currentTask.description,
                    wbs_id: currentTask.wbs_id,
                    start_date: currentTask.start_date,
                    end_date: currentTask.end_date,
                    duration: currentTask.duration,
                    estimated_hours: currentTask.estimated_hours,
                    work_package: currentTask.work_package,
                    priority: currentTask.priority,
                    is_milestone: currentTask.is_milestone,
                    is_critical_path: currentTask.is_critical_path,
                    status: newStatus,
                    progress_percentage: newProgress,
                    actual_end_date: actualEndDate,
                };

                await axios.put(`/api/tasks/${taskId}`, taskUpdate, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                });

                await updateWBSProgressAndParents(currentTask.wbs_id);
            }
        } catch (error) {
            console.error("Error checking task completion:", error);
        }
    };

    return {
        updateWBSProgressAndParents,
        checkAndUpdateTaskCompletion,
    };
};