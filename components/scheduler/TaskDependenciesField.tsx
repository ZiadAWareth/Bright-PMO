import React from "react";
import { calculateDatesFromDependency } from "@/components/scheduler/taskHelpers";
import { Task, ProjectSetup, TaskAddUpdate } from "@/types/project";

interface TaskDependenciesFieldProps {
  tasks: Task[];
  selectedPredecessors: number[];
  setSelectedPredecessors: React.Dispatch<React.SetStateAction<number[]>>;
  dependencyTypes: Record<number, string>;
  setDependencyTypes: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  lagTimes: Record<number, number>;
  setLagTimes: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setup: ProjectSetup | null;
  creating: boolean;
  dependencySearchTerm: string;
  setDependencySearchTerm: React.Dispatch<React.SetStateAction<string>>;
  showDependencyDropdown: boolean;
  setShowDependencyDropdown: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TaskDependenciesField({
  tasks,
  selectedPredecessors,
  setSelectedPredecessors,
  dependencyTypes,
  setDependencyTypes,
  lagTimes,
  setLagTimes,
  formData,
  setFormData,
  setup,
  creating,
  dependencySearchTerm,
  setDependencySearchTerm,
  showDependencyDropdown,
  setShowDependencyDropdown
}: TaskDependenciesFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Task Dependencies
      </label>
      <div className="space-y-4">
        {/* Add Dependency Section with Search */}
        <div>
          <div className="relative">
            <input
              type="text"
              value={dependencySearchTerm}
              onChange={e => {
                setDependencySearchTerm(e.target.value);
                setShowDependencyDropdown(true);
              }}
              onFocus={() => setShowDependencyDropdown(true)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Search tasks to add as dependency..."
              disabled={creating || tasks.filter(task => !selectedPredecessors.includes(task.task_id)).length === 0}
            />
            {showDependencyDropdown && tasks.filter((task: Task) =>
              !selectedPredecessors.includes(task.task_id) &&
              task.name.toLowerCase().includes(dependencySearchTerm.toLowerCase())
            ).length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {tasks
                  .filter((task: Task) =>
                    !selectedPredecessors.includes(task.task_id) &&
                    task.name.toLowerCase().includes(dependencySearchTerm.toLowerCase())
                  )
                  .map((task: Task) => (
                    <div
                      key={task.task_id}
                      onClick={() => {
                        setSelectedPredecessors((prev: number[]) => [...prev, task.task_id]);
                        setDependencyTypes((prev: Record<number, string>) => ({ ...prev, [task.task_id]: "finish_to_start" }));
                        setLagTimes((prev: Record<number, number>) => ({ ...prev, [task.task_id]: 0 }));
                        setDependencySearchTerm("");
                        setShowDependencyDropdown(false);
                        try {
                          const calculatedDates = calculateDatesFromDependency(
                            task,
                            'finish_to_start',
                            0,
                            formData.duration,
                            setup || null
                          );
                          setFormData((prev: Record<string, any>) => ({
                            ...prev,
                            start_date: calculatedDates.start_date,
                            end_date: calculatedDates.end_date,
                          }));
                        } catch (error) {
                          console.error('Error calculating dates:', error);
                        }
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {task.name}
                    </div>
                  ))}
                {tasks.filter((task: Task) =>
                  !selectedPredecessors.includes(task.task_id) &&
                  task.name.toLowerCase().includes(dependencySearchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                    No tasks found
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Search and select tasks that must be completed before this task can start. A task cannot depend on itself.
          </p>
        </div>
        {/* Dependency configuration for selected tasks */}
        {selectedPredecessors.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Configure Dependencies
            </h4>
            {selectedPredecessors.map((predId: number) => {
              const predTask = tasks.find((t: Task) => t.task_id === predId);
              if (!predTask) return null;
              return (
                <div key={predId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {predTask.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPredecessors((prev: number[]) => prev.filter((id: number) => id !== predId));
                        setDependencyTypes((prev: Record<number, string>) => {
                          const updated = { ...prev };
                          delete updated[predId];
                          return updated;
                        });
                        setLagTimes((prev: Record<number, number>) => {
                          const updated = { ...prev };
                          delete updated[predId];
                          return updated;
                        });
                      }}
                      disabled={creating}
                      className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Dependency Type
                      </label>
                      <select
                        value={dependencyTypes[predId] || "finish_to_start"}
                        onChange={e => {
                          const newDepType = e.target.value;
                          setDependencyTypes((prev: Record<number, string>) => ({ ...prev, [predId]: newDepType }));
                          const lag = lagTimes[predId] || 0;
                          try {
                            const calculatedDates = calculateDatesFromDependency(
                              predTask,
                              newDepType,
                              lag,
                              formData.duration,
                              setup || null
                            );
                            setFormData((prev: Record<string, any>) => ({
                              ...prev,
                              start_date: calculatedDates.start_date,
                              end_date: calculatedDates.end_date,
                            }));
                          } catch (error) {
                            console.error('Error calculating dates:', error);
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                        disabled={creating}
                      >
                        <option value="finish_to_start">Finish to Start</option>
                        <option value="start_to_start">Start to Start</option>
                        <option value="finish_to_finish">Finish to Finish</option>
                        <option value="start_to_finish">Start to Finish</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Lag Time (days)
                      </label>
                      <input
                        type="text"
                        value={lagTimes[predId] ?? 0}
                        onChange={e => {
                          const inputValue = e.target.value;
                          if (inputValue === '' || inputValue === '-') return;
                          const newLag = parseInt(inputValue);
                          if (!isNaN(newLag)) {
                            setLagTimes((prev: Record<number, number>) => ({ ...prev, [predId]: newLag }));
                            const depType = dependencyTypes[predId] || 'finish_to_start';
                            try {
                              const calculatedDates = calculateDatesFromDependency(
                                predTask,
                                depType,
                                newLag,
                                formData.duration,
                                setup || null
                              );
                              setFormData((prev: Record<string, any>) => ({
                                ...prev,
                                start_date: calculatedDates.start_date,
                                end_date: calculatedDates.end_date,
                              }));
                            } catch (error) {
                              console.error('Error calculating dates:', error);
                            }
                          }
                        }}
                        onBlur={e => {
                          const inputValue = e.target.value;
                          if (inputValue === '' || inputValue === '-') {
                            setLagTimes((prev: Record<number, number>) => ({ ...prev, [predId]: 0 }));
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                        disabled={creating}
                        placeholder="0 (negative = lead)"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {dependencyTypes[predId] === "finish_to_start" &&
                      `This task starts after the predecessor finishes${lagTimes[predId] ? ` + ${lagTimes[predId]} days` : ''}`}
                    {dependencyTypes[predId] === "start_to_start" &&
                      `This task starts when the predecessor starts${lagTimes[predId] ? ` + ${lagTimes[predId]} days` : ''}`}
                    {dependencyTypes[predId] === "finish_to_finish" &&
                      `This task finishes when the predecessor finishes${lagTimes[predId] ? ` + ${lagTimes[predId]} days` : ''}`}
                    {dependencyTypes[predId] === "start_to_finish" &&
                      `This task finishes when the predecessor starts${lagTimes[predId] ? ` + ${lagTimes[predId]} days` : ''}`}
                    <span className="block mt-1 text-gray-400">💡 Use negative lag for lead time (overlap)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
