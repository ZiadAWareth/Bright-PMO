import React from "react";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

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

interface ProjectScheduleHeaderProps {
    project: ProjectWithRelations | null;
    user: User | null;
    canEditSchedule: boolean;
    onBack: () => void;
    onCreateTask: () => void;
    onUploadTasks: () => void;
}

const ProjectScheduleHeader: React.FC<ProjectScheduleHeaderProps> = ({
    project,
    user,
    canEditSchedule,
    onBack,
    onCreateTask,
    onUploadTasks,
}) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Project Schedule
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {project?.name} - Timeline and milestone management
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                {user && (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium">
                        <span>
                            Logged in as: {user.first_name} {user.last_name}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded text-xs">
                            {user.role.name}
                        </span>
                        {!canEditSchedule && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 rounded text-xs">
                                Read Only
                            </span>
                        )}
                    </div>
                )}
                {canEditSchedule && (
                    <>
                        <button
                            onClick={onUploadTasks}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                            title="Bulk Upload Tasks from Excel"
                        >
                            <Upload size={16} />
                            <span>Excel Upload</span>
                        </button>
                        <button
                            onClick={onCreateTask}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Add Task</span>
                        </button>
                    </>
                )}
                {!canEditSchedule && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Viewing in read-only mode
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectScheduleHeader;