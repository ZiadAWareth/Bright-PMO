"use client";

import React, { useState } from "react";
import { Calendar, Target, Plus, CheckCircle } from "lucide-react";
import { GanttTask } from "./types";

interface CreateTaskModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  wbsItems: any[];
  creating: boolean;
  createType: "task" | "milestone";
  editingTask?: GanttTask;
}

const CreateTaskModal = ({
  onClose,
  onSave,
  wbsItems,
  creating,
  createType = "task",
  editingTask,
}: CreateTaskModalProps) => {
  const [formData, setFormData] = useState({
    name: editingTask?.name || "",
    description: editingTask?.description || "",
    wbs_id: editingTask?.wbsId || "",
    start_date: editingTask?.startDate
      ? editingTask.startDate.toISOString().split("T")[0]
      : "",
    end_date: editingTask?.endDate
      ? editingTask.endDate.toISOString().split("T")[0]
      : "",
    duration: editingTask?.duration || 1,
    estimated_hours:
      editingTask?.estimatedEffort || (createType === "milestone" ? 0 : 8),
    priority: editingTask?.priority || "medium",
    status: editingTask?.status || "todo",
    is_milestone: editingTask?.isMilestone || createType === "milestone",
    progress_percentage: editingTask?.progress || 0,
    work_package: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateDuration = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays || 1;
    }
    return 1;
  };

  const handleInputChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };

    if (field === "wbs_id" && value && !editingTask) {
      const selectedWBS = wbsItems.find(
        (wbs) => wbs.wbs_id === parseInt(value)
      );
      if (selectedWBS) {
        if (selectedWBS.start_date && !newFormData.start_date) {
          newFormData.start_date = new Date(selectedWBS.start_date)
            .toISOString()
            .split("T")[0];
        }
        if (selectedWBS.end_date && !newFormData.end_date) {
          newFormData.end_date = new Date(selectedWBS.end_date)
            .toISOString()
            .split("T")[0];
        } else if (selectedWBS.start_date && !newFormData.end_date) {
          const nextDay = new Date(selectedWBS.start_date);
          nextDay.setDate(nextDay.getDate() + 1);
          newFormData.end_date = nextDay.toISOString().split("T")[0];
        }
      }
    }

    if (
      field === "start_date" ||
      field === "end_date" ||
      (field === "wbs_id" && newFormData.start_date && newFormData.end_date)
    ) {
      if (newFormData.start_date && newFormData.end_date) {
        newFormData.duration = calculateDuration(
          newFormData.start_date,
          newFormData.end_date
        );
      }
    }

    setFormData(newFormData);

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = `${
        createType === "milestone" ? "Milestone" : "Task"
      } name is required`;
    }

    if (!formData.wbs_id) {
      newErrors.wbs_id = "WBS selection is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    if (formData.wbs_id && formData.start_date && formData.end_date) {
      const selectedWBS = wbsItems.find(
        (wbs) => wbs.wbs_id === parseInt(formData.wbs_id)
      );
      if (selectedWBS) {
        const taskStartDate = new Date(formData.start_date);
        const taskEndDate = new Date(formData.end_date);
      }
    }

    if (formData.duration < 1) {
      newErrors.duration = "Duration must be at least 1 day";
    }

    if (formData.estimated_hours < 0) {
      newErrors.estimated_hours = "Estimated hours cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      const submitData = {
        ...formData,
        wbs_id: parseInt(formData.wbs_id),
        duration: formData.duration,
        estimated_hours: formData.estimated_hours,
        progress_percentage: formData.progress_percentage,
        is_milestone: formData.is_milestone,
        start_date: formData.start_date.split('T')[0],
        end_date: formData.end_date.split('T')[0],
      };

      onSave(submitData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {editingTask ? "Edit" : "Create New"}{" "}
              {createType === "milestone" ? "Milestone" : "Task"}
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
            {/* Task/Milestone Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {createType === "milestone" ? "Milestone" : "Task"} Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                placeholder={`Enter ${
                  createType === "milestone" ? "milestone" : "task"
                } name`}
                disabled={creating}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={`Enter ${
                  createType === "milestone" ? "milestone" : "task"
                } description`}
                disabled={creating}
              />
            </div>

            {/* WBS Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                WBS Item *
              </label>
              <select
                value={formData.wbs_id}
                onChange={(e) => handleInputChange("wbs_id", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.wbs_id
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                disabled={creating}
              >
                <option value="">Select WBS Item</option>
                {wbsItems.map((wbs) => (
                  <option key={wbs.wbs_id} value={wbs.wbs_id}>
                    {wbs.wbs_code} - {wbs.name} (Level {wbs.level})
                  </option>
                ))}
              </select>
              {errors.wbs_id && (
                <p className="text-red-500 text-xs mt-1">{errors.wbs_id}</p>
              )}

              {/* Show WBS date constraints */}
              {formData.wbs_id &&
                (() => {
                  const selectedWBS = wbsItems.find(
                    (wbs) => wbs.wbs_id === parseInt(formData.wbs_id)
                  );
                  if (
                    selectedWBS &&
                    (selectedWBS.start_date || selectedWBS.end_date)
                  ) {
                    return (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar
                            size={14}
                            className="text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            WBS Date Constraints
                          </span>
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          {selectedWBS.start_date && (
                            <div>
                              • Task must start on or after:{" "}
                              {new Date(
                                selectedWBS.start_date
                              ).toLocaleDateString("en-GB")}
                            </div>
                          )}
                          {selectedWBS.end_date && (
                            <div>
                              • Task must end on or before:{" "}
                              {new Date(
                                selectedWBS.end_date
                              ).toLocaleDateString("en-GB")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    handleInputChange("start_date", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.start_date
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  disabled={creating}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.start_date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    handleInputChange("end_date", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.end_date
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  disabled={creating}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Duration & Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) =>
                    handleInputChange("duration", parseInt(e.target.value) || 1)
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.duration
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-400`}
                  disabled={true}
                />
                {errors.duration && (
                  <p className="text-red-500 text-xs mt-1">{errors.duration}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from date range
                </p>
              </div>

              {createType !== "milestone" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      handleInputChange(
                        "estimated_hours",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.estimated_hours
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    disabled={creating}
                  />
                  {errors.estimated_hours && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.estimated_hours}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    handleInputChange("priority", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={creating}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={creating}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            {/* Work Package */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Work Package
              </label>
              <input
                type="text"
                value={formData.work_package}
                onChange={(e) =>
                  handleInputChange("work_package", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter work package (optional)"
                disabled={creating}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              {createType === "milestone" ? (
                <div className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <Target className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    This will be created as a milestone
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_milestone"
                    checked={formData.is_milestone}
                    onChange={(e) =>
                      handleInputChange("is_milestone", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    disabled={creating}
                  />
                  <label
                    htmlFor="is_milestone"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    This is a milestone
                  </label>
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
                    <span>{editingTask ? "Updating..." : "Creating..."}</span>
                  </>
                ) : (
                  <>
                    {editingTask ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    <span>
                      {editingTask ? "Update" : "Create"}{" "}
                      {createType === "milestone" ? "Milestone" : "Task"}
                    </span>
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

export default CreateTaskModal;
