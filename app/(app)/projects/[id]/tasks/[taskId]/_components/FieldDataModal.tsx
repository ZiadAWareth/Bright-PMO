"use client";

import React, { useState } from "react";
import { Target } from "lucide-react";
import type { Task, FieldDataEntry } from "./types";

const FieldDataModal = ({
  task,
  editingEntry,
  onClose,
  onSave,
  isSubmitting,
}: {
  task: Task;
  editingEntry: FieldDataEntry | null;
  onClose: () => void;
  onSave: (data: any) => void;
  isSubmitting: boolean;
}) => {
  const [formData, setFormData] = useState<{
    resource_assignment_id: number | string;
    actual_progress: number | string;
    actual_hours: number | string;
    notes: string;
    is_according_to_plan: boolean;
  }>({
    resource_assignment_id:
      editingEntry?.resource_assignment?.assignment_id ?? "",
    actual_progress: editingEntry?.actual_progress ?? "",
    actual_hours: editingEntry?.actual_hours ?? "",
    notes: editingEntry?.notes || "",
    is_according_to_plan: editingEntry?.is_according_to_plan ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isDarkMode =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.resource_assignment_id) {
      newErrors.resource_assignment_id = "Please select a resource assignment";
    }

    if (
      formData.actual_progress === "" ||
      formData.actual_progress === null ||
      formData.actual_progress === undefined
    ) {
      newErrors.actual_progress = "Progress percentage is required";
    } else {
      const progressValue =
        typeof formData.actual_progress === "string"
          ? parseFloat(formData.actual_progress)
          : formData.actual_progress;
      if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
        newErrors.actual_progress = "Progress must be between 0 and 100";
      } else {
        const selectedAssignment = task.resource_assignments?.find(
          (assignment) =>
            assignment.assignment_id ===
            parseInt(formData.resource_assignment_id as string)
        );
        if (selectedAssignment) {
          const currentProgress = (selectedAssignment as any).progress || 0;

          if (editingEntry) {
            const originalProgress = editingEntry.actual_progress;
            const progressChange = progressValue - originalProgress;
            const potentialTotal = currentProgress + progressChange;

            if (potentialTotal > 100) {
              newErrors.actual_progress = `Changing from ${originalProgress}% to ${progressValue}% would result in ${potentialTotal}% total (current: ${currentProgress}%), which exceeds 100%`;
            }
          } else {
            const potentialTotal = currentProgress + progressValue;
            if (potentialTotal > 100) {
              newErrors.actual_progress = `Adding ${progressValue}% would result in ${potentialTotal}% total (current: ${currentProgress}%), which exceeds 100%`;
            }
          }
        }
      }
    }

    if (
      formData.actual_hours === "" ||
      formData.actual_hours === null ||
      formData.actual_hours === undefined
    ) {
      newErrors.actual_hours = "Actual hours is required";
    } else {
      const hoursValue =
        typeof formData.actual_hours === "string"
          ? parseFloat(formData.actual_hours)
          : formData.actual_hours;
      if (isNaN(hoursValue) || hoursValue < 0) {
        newErrors.actual_hours = "Actual hours must be non-negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        ...formData,
        resource_assignment_id:
          typeof formData.resource_assignment_id === "string"
            ? parseInt(formData.resource_assignment_id)
            : formData.resource_assignment_id,
        actual_progress:
          typeof formData.actual_progress === "string"
            ? parseFloat(formData.actual_progress)
            : formData.actual_progress,
        actual_hours:
          typeof formData.actual_hours === "string"
            ? parseFloat(formData.actual_hours)
            : formData.actual_hours,
      };
      onSave(submitData);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-md w-full shadow-2xl flex flex-col"
        style={{
          backgroundColor: isDarkMode
            ? "rgba(30, 41, 59, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isDarkMode
            ? "1px solid rgba(148, 163, 184, 0.2)"
            : "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center p-6 pb-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingEntry ? "Edit Field Data" : "Add Field Data"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {task.name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Resource Assignment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource Assignment *
            </label>
            <select
              value={formData.resource_assignment_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  resource_assignment_id: e.target.value,
                }))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.resource_assignment_id
                  ? "border-red-500"
                  : "border-gray-300 dark:border-slate-600"
              } bg-white dark:bg-slate-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select a resource assignment...</option>
              {task.resource_assignments?.map((assignment) => (
                <option
                  key={assignment.assignment_id}
                  value={assignment.assignment_id}
                >
                  {assignment.resource.name} ({assignment.resource.role}) -{" "}
                  {assignment.planned_hours}h planned •{" "}
                  {(assignment as any).progress || 0}% progress
                </option>
              ))}
            </select>
            {errors.resource_assignment_id && (
              <p className="text-red-500 text-xs mt-1">
                {errors.resource_assignment_id}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Select which resource assignment this field data is for
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Actual Progress */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {editingEntry ? "Progress (%) *" : "Additional Progress (%) *"}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={
                  formData.actual_progress === 0 ||
                  formData.actual_progress === ""
                    ? ""
                    : formData.actual_progress
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    actual_progress:
                      e.target.value === ""
                        ? ""
                        : parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder={
                  editingEntry
                    ? "Enter progress %"
                    : "Enter additional progress %"
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.actual_progress
                    ? "border-red-500"
                    : "border-gray-300 dark:border-slate-600"
                } bg-white dark:bg-slate-700 text-gray-900 dark:text-white`}
              />
              {errors.actual_progress && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.actual_progress}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {editingEntry
                  ? "Progress value for this field data entry"
                  : "Additional progress to add to the resource assignment total"}
              </p>
            </div>

            {/* Actual Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {editingEntry ? "Hours Worked *" : "Additional Hours Worked *"}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={
                  formData.actual_hours === 0 || formData.actual_hours === ""
                    ? ""
                    : formData.actual_hours
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    actual_hours:
                      e.target.value === ""
                        ? ""
                        : parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder={
                  editingEntry ? "Hours worked" : "Additional hours worked"
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.actual_hours
                    ? "border-red-500"
                    : "border-gray-300 dark:border-slate-600"
                } bg-white dark:bg-slate-700 text-gray-900 dark:text-white`}
              />
              {errors.actual_hours && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.actual_hours}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {editingEntry
                  ? "Hours value for this field data entry"
                  : "Additional hours to add to the resource assignment total"}
              </p>
            </div>
          </div>

          {/* Progress Calculator Display */}
          {formData.resource_assignment_id &&
            (formData.actual_progress || formData.actual_hours) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Progress Calculator
                </h4>
                {(() => {
                  const selectedAssignment = task.resource_assignments?.find(
                    (assignment) =>
                      assignment.assignment_id ===
                      parseInt(formData.resource_assignment_id as string)
                  );
                  if (!selectedAssignment) return null;

                  const currentProgress =
                    (selectedAssignment as any).progress || 0;
                  const currentHours = selectedAssignment.actual_hours || 0;
                  const inputProgress =
                    typeof formData.actual_progress === "string"
                      ? parseFloat(formData.actual_progress) || 0
                      : formData.actual_progress || 0;
                  const inputHours =
                    typeof formData.actual_hours === "string"
                      ? parseFloat(formData.actual_hours) || 0
                      : formData.actual_hours || 0;

                  let progressChange,
                    hoursChange,
                    newTotalProgress,
                    newTotalHours;

                  if (editingEntry) {
                    progressChange =
                      inputProgress - editingEntry.actual_progress;
                    hoursChange = inputHours - editingEntry.actual_hours;
                    newTotalProgress = currentProgress + progressChange;
                    newTotalHours = currentHours + hoursChange;
                  } else {
                    progressChange = inputProgress;
                    hoursChange = inputHours;
                    newTotalProgress = currentProgress + inputProgress;
                    newTotalHours = currentHours + inputHours;
                  }
                  const willComplete = newTotalProgress >= 100;

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-800 dark:text-blue-200">
                          Current Progress:
                        </span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {currentProgress}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-800 dark:text-blue-200">
                          {editingEntry ? "Change:" : "Adding:"}
                        </span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {progressChange >= 0 ? "+" : ""}
                          {progressChange}%
                        </span>
                      </div>
                      <div className="border-t border-blue-200 dark:border-blue-700 pt-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-blue-800 dark:text-blue-200">
                            New Total Progress:
                          </span>
                          <span
                            className={`font-bold ${
                              newTotalProgress > 100
                                ? "text-red-600 dark:text-red-400"
                                : willComplete
                                ? "text-green-600 dark:text-green-400"
                                : "text-blue-900 dark:text-blue-100"
                            }`}
                          >
                            {newTotalProgress}%
                            {newTotalProgress > 100 && " (Exceeds 100%)"}
                            {willComplete &&
                              newTotalProgress <= 100 &&
                              " (Will Complete!)"}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-blue-800 dark:text-blue-200">
                            New Total Hours:
                          </span>
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            {newTotalHours}h
                          </span>
                        </div>

                        {/* Cost Calculator */}
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            💰 Cost Impact
                          </h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-800 dark:text-blue-200">
                                Rate:
                              </span>
                              <span className="font-medium text-blue-900 dark:text-blue-100">
                                ${selectedAssignment.resource.rate}/hr
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-800 dark:text-blue-200">
                                Cost Change:
                              </span>
                              <span
                                className={`font-bold ${
                                  hoursChange > 0
                                    ? "text-orange-600 dark:text-orange-400"
                                    : hoursChange < 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-blue-900 dark:text-blue-100"
                                }`}
                              >
                                {hoursChange >= 0 ? "+" : ""}$
                                {(
                                  hoursChange * selectedAssignment.resource.rate
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1">
                              <span className="font-medium text-blue-800 dark:text-blue-200">
                                New Total Cost:
                              </span>
                              <span className="font-bold text-blue-900 dark:text-blue-100">
                                $
                                {(
                                  newTotalHours *
                                  selectedAssignment.resource.rate
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {hoursChange > 0 && (
                            <div className="mt-2 text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                              ⚠️ This will increase project costs and update
                              budget actuals through the WBS hierarchy.
                            </div>
                          )}
                        </div>
                      </div>
                      {willComplete && newTotalProgress <= 100 && (
                        <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded text-green-800 dark:text-green-200 text-xs">
                          🎉 This assignment will be marked as complete when you
                          submit this entry!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add any observations or notes about the progress..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Progress Status *
            </label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_according_to_plan"
                  checked={formData.is_according_to_plan === true}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      is_according_to_plan: true,
                    }))
                  }
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  On Track
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_according_to_plan"
                  checked={formData.is_according_to_plan === false}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      is_according_to_plan: false,
                    }))
                  }
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Off Track
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              <Target size={16} />
              <span>
                {isSubmitting
                  ? editingEntry
                    ? "Updating..."
                    : "Creating..."
                  : editingEntry
                  ? "Update Field Data"
                  : "Add Field Data"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FieldDataModal;
