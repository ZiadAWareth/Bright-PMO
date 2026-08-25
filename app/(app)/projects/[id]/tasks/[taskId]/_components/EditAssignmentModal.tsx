"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { Task } from "./types";

const EditAssignmentModal = ({
  assignment,
  resources,
  task,
  existingAssignments,
  onClose,
  onSave,
}: {
  assignment: any;
  resources: any[];
  task: Task;
  existingAssignments: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}) => {
  const [formData, setFormData] = useState({
    resource_id: assignment.resource_id,
    allocation_percentage: assignment.allocation_percentage,
    start_date: assignment.start_date.split("T")[0],
    end_date: assignment.end_date.split("T")[0],
    planned_hours: assignment.planned_hours,
    actual_hours: assignment.actual_hours,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      return newData;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.resource_id) {
      newErrors.resource_id = "Resource selection is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
    }

    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.start_date) > new Date(formData.end_date)
    ) {
      newErrors.end_date = "End date must be after start date";
    }

    if (formData.start_date && formData.end_date) {
      const assignmentStartDate = new Date(formData.start_date + "T00:00:00");
      const assignmentEndDate = new Date(formData.end_date + "T00:00:00");
      const taskStartDate = new Date(
        task.start_date.split("T")[0] + "T00:00:00"
      );
      const taskEndDate = new Date(task.end_date.split("T")[0] + "T00:00:00");

      if (assignmentStartDate < taskStartDate) {
        newErrors.start_date = `Assignment start date cannot be before task start date (${taskStartDate.toLocaleDateString(
          "en-GB"
        )})`;
      }

      if (assignmentEndDate > taskEndDate) {
        newErrors.end_date = `Assignment end date cannot be after task end date (${taskEndDate.toLocaleDateString(
          "en-GB"
        )})`;
      }
    }

    if (
      formData.allocation_percentage <= 0 ||
      formData.allocation_percentage > 100
    ) {
      newErrors.allocation_percentage =
        "Allocation must be between 1% and 100%";
    }

    if (formData.planned_hours <= 0) {
      newErrors.planned_hours = "Planned hours must be greater than 0";
    }

    if (formData.actual_hours < 0) {
      newErrors.actual_hours = "Actual hours cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUpdating(true);

    try {
      const assignmentData = {
        ...assignment,
        ...formData,
      };

      await onSave(assignmentData);
    } finally {
      setUpdating(false);
    }
  };

  const selectedResource = resources.find(
    (r) => r.resource_id === formData.resource_id
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Assignment
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Resource Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resource *
            </label>
            <select
              value={formData.resource_id}
              onChange={(e) =>
                handleInputChange("resource_id", parseInt(e.target.value))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.resource_id
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
            >
              <option value="">Select Resource</option>
              {resources.map((resource) => (
                <option key={resource.resource_id} value={resource.resource_id}>
                  {resource.name} - {resource.role} ({resource.type})
                </option>
              ))}
            </select>
            {errors.resource_id && (
              <p className="mt-1 text-sm text-red-600">{errors.resource_id}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  handleInputChange("start_date", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.start_date
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.end_date
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Allocation Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allocation Percentage *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.allocation_percentage || ""}
              onChange={(e) =>
                handleInputChange(
                  "allocation_percentage",
                  e.target.value === "" ? "" : parseInt(e.target.value) || 0
                )
              }
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.allocation_percentage
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
              placeholder="50"
            />
            {errors.allocation_percentage && (
              <p className="mt-1 text-sm text-red-600">
                {errors.allocation_percentage}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Percentage allocation of this resource to the task. Independent
              from planned hours.
            </p>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Planned Hours *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.planned_hours || ""}
                onChange={(e) =>
                  handleInputChange(
                    "planned_hours",
                    e.target.value === "" ? "" : parseFloat(e.target.value) || 0
                  )
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.planned_hours
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
                placeholder="8"
              />
              {errors.planned_hours && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.planned_hours}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Total hours planned for this assignment (out of{" "}
                {task.estimated_hours}h). Changing this will automatically
                update allocation percentage
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actual Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.actual_hours || ""}
                onChange={(e) =>
                  handleInputChange(
                    "actual_hours",
                    e.target.value === "" ? "" : parseFloat(e.target.value) || 0
                  )
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.actual_hours
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
                placeholder="0"
              />
              {errors.actual_hours && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.actual_hours}
                </p>
              )}
            </div>
          </div>

          {/* Resource Info & Cost Estimation */}
          {selectedResource && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Rate: ${selectedResource.rate}/hour</div>
                  <div>Capacity: {selectedResource.capacity}h/day</div>
                  <div>Department: {selectedResource.department || "N/A"}</div>
                </div>
              </div>

              {/* Cost Estimation */}
              {formData.planned_hours > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                    Cost Estimation
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Estimated Cost: $
                    {(selectedResource.rate * formData.planned_hours).toFixed(
                      2
                    )}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ({formData.planned_hours}h × ${selectedResource.rate}/hr)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {updating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Assignment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssignmentModal;
