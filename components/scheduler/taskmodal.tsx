import React, { useState } from "react";
import { Task, ProjectSetup, TaskAddUpdate } from "@/types/project";
import { Plus, Calendar } from "lucide-react";
import { useTaskForm } from "@/hooks/useTaskForm";
import { useTaskDependencies } from "@/hooks/useTaskDependencies";
import { useSearchableDropdown } from "@/hooks/useSearchableDropdown";
import { SearchableDropdown } from "@/components/form/SearchableDropdown";
import { FormFieldWrapper } from "@/components/form/FormFieldWrapper";
import { DynamicInput } from "@/components/form/DynamicInput";
import { DependencyConfigCard } from "@/components/form/DependencyConfigCard";
import { getTaskFieldConfig } from "@/components/scheduler/taskFieldConfig";

interface TaskModalProps {
  mode?: 'create' | 'edit';
  task?: Task;
  onClose: () => void;
  onSave: (data: any) => Promise<any>;
  wbsItems: any[];
  setup: ProjectSetup | null;
  creating: boolean;
  tasks?: Task[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  mode = 'create',
  task,
  onClose,
  onSave,
  wbsItems,
  creating,
  tasks = [],
  setup,
}) => {
  const [autoRecalculateDates, setAutoRecalculateDates] = useState(mode === 'create');
  // Prepare initial data for edit mode
  const initialFormData = mode === 'edit' && task ? {
    name: task.name,
    description: task.description || '',
    wbs_id: task.wbs_id?.toString() || '',
    start_date: task.start_date,
    end_date: task.end_date,
    duration: task.duration,
    estimated_hours: task.estimated_hours,
    priority: task.priority,
    status: task.status,
    is_milestone: task.is_milestone,
    progress_percentage: task.progress_percentage || 0,
    work_package: task.work_package || '',
  } as Partial<TaskAddUpdate> : undefined;

  const initialDependencies = mode === 'edit' && task?.successor_dependencies
  ? task.successor_dependencies
      .filter(dep => dep.predecessor_task_id !== undefined && dep.dependency_id !== undefined)
      .map(dep => ({
        predecessor_task_id: dep.predecessor_task_id!,
        dependency_type: dep.dependency_type,
        lag_time: dep.lag_time,
        dependency_id: dep.dependency_id!,
      }))
  : [];
  
  // Hooks
  const form = useTaskForm({ setup, wbsItems, initialData: initialFormData });
  
  const dependencies = useTaskDependencies({
    tasks,
    formData: form.formData,
    setFormData: form.setFormData,
    setup,
    initialDependencies,
    taskId: task?.task_id,
  });

  // WBS Dropdown
  const wbsDropdown = useSearchableDropdown({
    items: wbsItems,
    filterFn: (wbs, term) =>
      `${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`
        .toLowerCase()
        .includes(term.toLowerCase()),
    displayFn: (wbs) => `${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`,
    selectedValue: form.formData.wbs_id,
  });

  // Dependency Dropdown
  const availableTasksForDependency = tasks.filter(
    (t) => t.task_id !== task?.task_id && !dependencies.selectedPredecessors.includes(t.task_id)
  );

  const dependencyDropdown = useSearchableDropdown({
    items: availableTasksForDependency,
    filterFn: (task, term) => task.name.toLowerCase().includes(term.toLowerCase()),
    displayFn: (task) => task.name,
  });

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validateForm()) return;

    const submitData = {
      ...form.formData,
      wbs_id: parseInt(form.formData.wbs_id as string),
      start_date: form.formData.start_date.split("T")[0],
      end_date: form.formData.end_date.split("T")[0],
    };

    if (mode === 'edit' && task) {
      await onSave(submitData);
      if (task.predecessor_dependencies) {
        await dependencies.updateDependencies(task.task_id, task.predecessor_dependencies);
      }
    } else {
      const createdTask = await onSave(submitData);
      if (createdTask?.task_id && dependencies.selectedPredecessors.length > 0) {
        await dependencies.saveDependencies(createdTask.task_id);
      }
    }

    onClose();
    setTimeout(() => window.location.reload(), 500);
  };

  // Field configuration
  const taskFields = getTaskFieldConfig(setup);

  // Helper to render WBS constraints
  const renderWbsConstraints = () => {
    if (!form.formData.wbs_id) return null;
    
    const selectedWBS = wbsItems.find((wbs) => wbs.wbs_id === parseInt(form.formData.wbs_id as string));
    if (!selectedWBS || (!selectedWBS.start_date && !selectedWBS.end_date)) return null;

    return (
      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center space-x-2 mb-1">
          <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            WBS Date Constraints
          </span>
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-300">
          {selectedWBS.start_date && (
            <div>• Task must start on or after: {new Date(selectedWBS.start_date).toLocaleDateString("en-GB")}</div>
          )}
          {selectedWBS.end_date && (
            <div>• Task must end on or before: {new Date(selectedWBS.end_date).toLocaleDateString("en-GB")}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'edit' ? 'Edit Task' : 'Create New Task'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              disabled={creating}
            >
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dynamic Form Fields */}
            {/* Render fields in order, grouping as needed */}
            {(() => {
              const groupedKeys = [
                ["start_date", "end_date"],
                ["duration", "estimated_hours"],
                ["priority", "status"],
              ];
              const isGroupedKey = (key: any) => groupedKeys.some(group => group.includes(key));
              const getGroupForKey = (key: any) => groupedKeys.find(group => group[0] === key);
              let i = 0;
              const fields = [];
              while (i < taskFields.length) {
                const field = taskFields[i];
                const group = getGroupForKey(field.key);
                if (group) {
                  // Render the group in a row
                  fields.push(
                    <div className="flex gap-4" key={group.join("-")}>
                      {group.map((key) => {
                        const f = taskFields.find(tf => tf.key === key);
                        if (!f) return null;
                        // Special handling for WBS search
                        if (f.key === 'wbs_id') {
                          return (
                            <div className="flex-1" key={f.key}>
                              <FormFieldWrapper
                                label={f.label}
                                error={form.errors[f.key]}
                                helper={f.helper}
                                required={f.required}
                              >
                                <SearchableDropdown
                                  value={form.formData.wbs_id as string}
                                  searchTerm={wbsDropdown.searchTerm}
                                  showDropdown={wbsDropdown.showDropdown}
                                  filteredItems={wbsDropdown.filteredItems}
                                  displayValue={wbsDropdown.displayValue}
                                  onSearchChange={(value) => {
                                    wbsDropdown.setSearchTerm(value);
                                    wbsDropdown.setShowDropdown(true);
                                  }}
                                  onFocus={() => wbsDropdown.setShowDropdown(true)}
                                  onSelect={(wbs) =>
                                    wbsDropdown.handleSelect(wbs, () =>
                                      form.handleInputChange("wbs_id", wbs.wbs_id.toString())
                                    )
                                  }
                                  onClear={() =>
                                    wbsDropdown.handleClear(() => form.handleInputChange("wbs_id", ""))
                                  }
                                  renderItem={(wbs) => `${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`}
                                  getItemKey={(wbs) => wbs.wbs_id}
                                  placeholder={f.placeholder}
                                  disabled={creating}
                                  error={form.errors[f.key]}
                                />
                                {renderWbsConstraints()}
                              </FormFieldWrapper>
                            </div>
                          );
                        }
                        // Special handling for checkbox (label is inside DynamicInput)
                        if (f.type === 'checkbox') {
                          return (
                            <div className="flex-1" key={f.key}>
                              <FormFieldWrapper error={form.errors[f.key]}>
                                <DynamicInput
                                  type="checkbox"
                                  id={f.key}
                                  label={f.label}
                                  value={form.getFieldValue(f.key)}
                                  onChange={(value) => form.handleInputChange(f.key, value)}
                                  disabled={creating}
                                />
                              </FormFieldWrapper>
                            </div>
                          );
                        }
                        // All other field types
                        return (
                          <div className="flex-1" key={f.key}>
                            <FormFieldWrapper
                              label={f.label}
                              error={form.errors[f.key]}
                              helper={f.helper}
                              required={f.required}
                              htmlFor={f.key}
                            >
                              <DynamicInput
                                type={f.type as any}
                                value={form.getFieldValue(f.key)}
                                onChange={(value) => form.handleInputChange(f.key, value)}
                                placeholder={f.placeholder}
                                disabled={creating}
                                min={f.min}
                                step={f.step}
                                rows={f.rows}
                                options={f.options}
                                error={form.errors[f.key]}
                              />
                            </FormFieldWrapper>
                          </div>
                        );
                      })}
                    </div>
                  );
                  i += group.length;
                  continue;
                }
                if (isGroupedKey(field.key)) {
                  i++;
                  continue; // skip fields that are part of a group but not the first in the group
                }
                // Special handling for WBS search
                if (field.key === 'wbs_id') {
                  fields.push(
                    <FormFieldWrapper
                      key={field.key}
                      label={field.label}
                      error={form.errors[field.key]}
                      helper={field.helper}
                      required={field.required}
                    >
                      <SearchableDropdown
                        value={form.formData.wbs_id as string}
                        searchTerm={wbsDropdown.searchTerm}
                        showDropdown={wbsDropdown.showDropdown}
                        filteredItems={wbsDropdown.filteredItems}
                        displayValue={wbsDropdown.displayValue}
                        onSearchChange={(value) => {
                          wbsDropdown.setSearchTerm(value);
                          wbsDropdown.setShowDropdown(true);
                        }}
                        onFocus={() => wbsDropdown.setShowDropdown(true)}
                        onSelect={(wbs) =>
                          wbsDropdown.handleSelect(wbs, () =>
                            form.handleInputChange("wbs_id", wbs.wbs_id.toString())
                          )
                        }
                        onClear={() =>
                          wbsDropdown.handleClear(() => form.handleInputChange("wbs_id", ""))
                        }
                        renderItem={(wbs) => `${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`}
                        getItemKey={(wbs) => wbs.wbs_id}
                        placeholder={field.placeholder}
                        disabled={creating}
                        error={form.errors[field.key]}
                      />
                      {renderWbsConstraints()}
                    </FormFieldWrapper>
                  );
                  i++;
                  continue;
                }
                if (field.type === 'checkbox') {
                  fields.push(
                    <FormFieldWrapper key={field.key} error={form.errors[field.key]}>
                      <DynamicInput
                        type="checkbox"
                        id={field.key}
                        label={field.label}
                        value={form.getFieldValue(field.key)}
                        onChange={(value) => form.handleInputChange(field.key, value)}
                        disabled={creating}
                      />
                    </FormFieldWrapper>
                  );
                  i++;
                  continue;
                }
                // All other field types
                fields.push(
                  <FormFieldWrapper
                    key={field.key}
                    label={field.label}
                    error={form.errors[field.key]}
                    helper={field.helper}
                    required={field.required}
                    htmlFor={field.key}
                  >
                    <DynamicInput
                      type={field.type as any}
                      value={form.getFieldValue(field.key)}
                      onChange={(value) => form.handleInputChange(field.key, value)}
                      placeholder={field.placeholder}
                      disabled={creating}
                      min={field.min}
                      step={field.step}
                      rows={field.rows}
                      options={field.options}
                      error={form.errors[field.key]}
                    />
                  </FormFieldWrapper>
                );
                i++;
              }
              return fields;
            })()}

            {/* Task Dependencies Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Dependencies
              </label>
              
              {/* Dependency Search */}
              <SearchableDropdown
                value=""
                searchTerm={dependencyDropdown.searchTerm}
                showDropdown={dependencyDropdown.showDropdown}
                filteredItems={dependencyDropdown.filteredItems}
                displayValue={dependencyDropdown.searchTerm}
                onSearchChange={(value) => {
                  dependencyDropdown.setSearchTerm(value);
                  dependencyDropdown.setShowDropdown(true);
                }}
                onFocus={() => dependencyDropdown.setShowDropdown(true)}
                onSelect={(task) => {
                  dependencies.addDependency(task.task_id, task);
                  dependencyDropdown.setSearchTerm("");
                  dependencyDropdown.setShowDropdown(false);
                }}
                onClear={() => {}}
                renderItem={(task) => task.name}
                getItemKey={(task) => task.task_id}
                placeholder="Search tasks to add as dependency..."
                disabled={creating || availableTasksForDependency.length === 0}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Search and select tasks that must be completed before this task can start.
              </p>

              {/* Configure Dependencies */}
              {dependencies.selectedPredecessors.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Configure Dependencies
                    </h4>
                    {mode === 'edit' && (
                      <label className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={autoRecalculateDates}
                          onChange={(e) => setAutoRecalculateDates(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>Auto-recalculate dates</span>
                      </label>
                    )}
                  </div>

                  {dependencies.selectedPredecessors.map((predId) => {
                    const predTask = tasks.find((t) => t.task_id === predId);
                    if (!predTask) return null;

                    return (
                      <DependencyConfigCard
                        key={predId}
                        taskName={predTask.name}
                        dependencyType={dependencies.dependencyTypes[predId] || "finish_to_start"}
                        lagTime={dependencies.lagTimes[predId] ?? 0}
                        onTypeChange={(type) =>
                          dependencies.updateDependencyType(predId, type, autoRecalculateDates)
                        }
                        onLagChange={(lag) =>
                          dependencies.updateLagTime(predId, lag, autoRecalculateDates)
                        }
                        onRemove={() => dependencies.removeDependency(predId)}
                        disabled={creating}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{mode === 'edit' ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>{mode === 'edit' ? 'Update Task' : 'Create Task'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;