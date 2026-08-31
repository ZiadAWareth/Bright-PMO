import React from "react";
import { ArrowLeft, Plus } from "lucide-react";
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
}
const ProjectScheduleHeader: React.FC<ProjectScheduleHeaderProps> = ({
    project,
    user,
    canEditSchedule,
    onBack,
    onCreateTask,
}) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-surface-2 rounded-lg"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-ink">
                        Project Schedule
                    </h1>
                    <p className="text-muted">
                        {project?.name} - Timeline and milestone management
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-3">
                {user && (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-info-soft text-info rounded-md text-sm font-medium">
                        <span>
                            Logged in as: {user.first_name} {user.last_name}
                        </span>
                        <span className="px-2 py-1 bg-info-soft rounded text-xs">
                            {user.role.name}
                        </span>
                        {!canEditSchedule && (
                            <span className="px-2 py-1 bg-warning-soft text-warning rounded text-xs">
                                Read Only
                            </span>
                        )}
                    </div>
                )}
                {canEditSchedule && (
                    <>
                        <button
                            onClick={onCreateTask}
                            className="flex items-center space-x-2 px-4 py-2 bg-info text-white rounded-md hover:opacity-90 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Add Task</span>
                        </button>
                    </>
                )}
                {!canEditSchedule && (
                    <div className="text-sm text-muted italic">
                        Viewing in read-only mode
                    </div>
                )}
            </div>
        </div>
    );
};
export default ProjectScheduleHeader;