import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ProjectWithRelations, Task, ProjectSetup } from "@/types/project";


export const useProjectSchedule = (projectId: string) => {
    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [wbsItems, setWbsItems] = useState<any[]>([]);
    const [setup, setSetup] = useState<ProjectSetup | null>(null);

    const fetchProjectData = async () => {
        try {
            const response = await axios.get(`/api/projects/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setProject(response.data);
        } catch (error) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project data");
        }
    };

    const fetchSetupStatus = async () => {
        try {
            const response = await axios.get(
                `/api/projects/${projectId}/setup`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            setSetup(response.data);
        } catch (error) {
            setSetup(null);
        }
    };

    const fetchTasksData = async () => {
        try {
            setLoading(true);

            const authHeader = {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            };

            const [wbsResponse, tasksResponse] = await Promise.all([
                axios.get(`/api/projects/${projectId}/wbs`, authHeader),
                axios.get(`/api/projects/${projectId}/tasks`, authHeader),
            ]);

            setWbsItems(wbsResponse.data);
            setTasks(tasksResponse.data);

            setLoading(false);
            return tasksResponse.data;
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to load schedule data");
            setLoading(false);
            return [];
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectData();
            fetchTasksData();
            fetchSetupStatus();
        }
    }, [projectId]);

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