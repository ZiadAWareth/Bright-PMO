import React from "react";
import { Search } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";

interface ScheduleFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    filterPriority: string;
    setFilterPriority: (priority: string) => void;
    tasksCount: number;
    filteredCount: number;
}

const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    tasksCount,
    filteredCount,
}) => {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface border border-line rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 min-w-[200px]">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-faint"
                    />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-line rounded-md bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted font-medium">
                            Status:
                        </span>
                        <Dropdown
                          value={String(filterStatus ?? '')}
                          onChange={(__v: string) => setFilterStatus(__v)}
                          options={[
                          { value: String("all"), label: "All Status" },
                          { value: String("todo"), label: "To Do" },
                          { value: String("in_progress"), label: "In Progress" },
                          { value: String("completed"), label: "Completed" },
                          { value: String("on_hold"), label: "On Hold" },
                        ]}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted font-medium">
                            Priority:
                        </span>
                        <Dropdown
                          value={String(filterPriority ?? '')}
                          onChange={(__v: string) => setFilterPriority(__v)}
                          options={[
                          { value: String("all"), label: "All Priority" },
                          { value: String("high"), label: "High" },
                          { value: String("medium"), label: "Medium" },
                          { value: String("low"), label: "Low" },
                        ]}
                        />
                    </div>
                </div>
            </div>
            <div className="px-3 py-1 bg-info-soft text-info rounded-full text-xs font-medium">
                {filteredCount} of {tasksCount} tasks
            </div>
        </div>
    );
};

export default ScheduleFilters;