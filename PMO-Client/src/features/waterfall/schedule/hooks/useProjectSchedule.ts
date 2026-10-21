import { useState } from "react";
import { ProjectWithRelations, Task, ProjectSetup } from "@/features/projects/types";

/**
 * Data for the schedule screen: the project, its WBS items, tasks and setup.
 *
 * notConnected: all four would be loaded from the backend (the fetch functions
 * below). Until then they start empty and nothing is loading.
 */
export const useProjectSchedule = (_projectId: string) => {
    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [wbsItems, setWbsItems] = useState<any[]>([]);
    const [setup, setSetup] = useState<ProjectSetup | null>(null);

    const fetchProjectData = async () => {};
    const fetchSetupStatus = async () => {};
    const fetchTasksData = async (): Promise<any> => {};

    return {
        project,
        tasks,
        loading,
        wbsItems,
        setup,
        setProject,
        setTasks,
        setLoading,
        setWbsItems,
        setSetup,
        fetchProjectData,
        fetchTasksData,
        fetchSetupStatus,
    };
};
