import React from "react";
import { Calendar, Building, Flag, Zap } from "lucide-react";

interface ViewTabsProps {
    activeView: "calendar" | "phases" | "milestones" | "critical";
    onViewChange: (view: "calendar" | "phases" | "milestones" | "critical") => void;
}

const ViewTabs: React.FC<ViewTabsProps> = ({ activeView, onViewChange }) => {
    const views = [
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "phases", label: "Phases", icon: Building },
        { id: "milestones", label: "Milestones", icon: Flag },
        { id: "critical", label: "Critical Path", icon: Zap },
    ] as const;

    return (
        <div className="flex items-center space-x-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            {views.map((view) => {
                const IconComponent = view.icon;
                return (
                    <button
                        key={view.id}
                        onClick={() => onViewChange(view.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                            activeView === view.id
                                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-medium"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                    >
                        <IconComponent
                            size={16}
                            className={activeView === view.id ? "text-blue-500" : ""}
                        />
                        <span className={activeView === view.id ? "font-medium" : ""}>
                            {view.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default ViewTabs;