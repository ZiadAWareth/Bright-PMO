"use client";

import React, { useState } from "react";
import { X, CheckCircle } from "lucide-react";

interface ResourceDetailModalProps {
  assignment: any;
  onClose: () => void;
  onUpdate: (assignmentId: number, updateData: any) => void;
  onDelete: (assignmentId: number, resourceName: string) => void;
  onTaskStatusUpdate: (taskId: string, newStatus: string) => void;
}

const ResourceDetailModal = ({
  assignment,
  onClose,
  onUpdate,
  onDelete,
  onTaskStatusUpdate,
}: ResourceDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    allocation_percentage: assignment.allocation_percentage || 100,
    start_date: assignment.start_date
      ? new Date(assignment.start_date).toISOString().split("T")[0]
      : "",
    end_date: assignment.end_date
      ? new Date(assignment.end_date).toISOString().split("T")[0]
      : "",
    planned_hours: assignment.planned_hours || 0,
    actual_hours: assignment.actual_hours || 0,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    await onUpdate(assignment.assignment_id, formData);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    onDelete(assignment.assignment_id, resource.name);
  };

  const resource = assignment.resource || {};
  const task = assignment.task || {};

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Resource Assignment Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {resource.name} - {task.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              disabled={isEditing || isDeleting}
            >
              <X size={20} />
            </button>
          </div>

          {/* Resource Information */}
          <div
            className={`mb-6 p-4 border rounded-lg ${
              assignment.actual_hours >= assignment.planned_hours
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            }`}
          >
            <h3
              className={`text-lg font-semibold mb-3 flex items-center ${
                assignment.actual_hours >= assignment.planned_hours
                  ? "text-green-900 dark:text-green-100"
                  : "text-blue-900 dark:text-blue-100"
              }`}
            >
              Resource Information
              {assignment.actual_hours >= assignment.planned_hours && (
                <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
                  Completed
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label
                  className={`block font-medium ${
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Name:
                </label>
                <span
                  className={
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-900 dark:text-green-100"
                      : "text-blue-900 dark:text-blue-100"
                  }
                >
                  {resource.name || "N/A"}
                </span>
              </div>
              <div>
                <label
                  className={`block font-medium ${
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Role:
                </label>
                <span
                  className={
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-900 dark:text-green-100"
                      : "text-blue-900 dark:text-blue-100"
                  }
                >
                  {resource.role || "N/A"}
                </span>
              </div>
              <div>
                <label
                  className={`block font-medium ${
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Type:
                </label>
                <span
                  className={
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-900 dark:text-green-100"
                      : "text-blue-900 dark:text-blue-100"
                  }
                >
                  {resource.type || "N/A"}
                </span>
              </div>
              <div>
                <label
                  className={`block font-medium ${
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Rate:
                </label>
                <span
                  className={
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-900 dark:text-green-100"
                      : "text-blue-900 dark:text-blue-100"
                  }
                >
                  ${resource.rate || 0}/hr
                </span>
              </div>
              <div>
                <label
                  className={`block font-medium ${
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Department:
                </label>
                <span
                  className={
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-900 dark:text-green-100"
                      : "text-blue-900 dark:text-blue-100"
                  }
                >
                  {resource.department || "N/A"}
                </span>
              </div>
              <div>
                <label
                  className={`block font-medium ${
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300"
                  }`}
                >
                  Capacity:
                </label>
                <span
                  className={
                    assignment.actual_hours >= assignment.planned_hours
                      ? "text-green-900 dark:text-green-100"
                      : "text-blue-900 dark:text-blue-100"
                  }
                >
                  {resource.capacity || 8}h/day
                </span>
              </div>
              {resource.skills && (
                <div className="col-span-2">
                  <label className="block text-blue-700 dark:text-blue-300 font-medium">
                    Skills:
                  </label>
                  <span className="text-blue-900 dark:text-blue-100">
                    {typeof resource.skills === "object"
                      ? Object.entries(resource.skills)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")
                      : resource.skills}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Details Form */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Assignment Details
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Allocation Percentage
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.allocation_percentage}
                    onChange={(e) =>
                      handleInputChange(
                        "allocation_percentage",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isEditing || isDeleting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Planned Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.planned_hours}
                    onChange={(e) =>
                      handleInputChange(
                        "planned_hours",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isEditing || isDeleting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      handleInputChange("start_date", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isEditing || isDeleting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      handleInputChange("end_date", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isEditing || isDeleting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Actual Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.actual_hours}
                    onChange={(e) =>
                      handleInputChange(
                        "actual_hours",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isEditing || isDeleting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task Status
                  </label>
                  <select
                    value={task.status || "todo"}
                    onChange={(e) =>
                      onTaskStatusUpdate(`task-${task.task_id}`, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isEditing || isDeleting}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Cost Information */}
              {resource.rate && formData.planned_hours > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                    Cost Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 dark:text-green-300">
                        Planned Cost:
                      </span>
                      <span className="ml-2 text-green-900 dark:text-green-100">
                        OMR {(resource.rate * formData.planned_hours).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300">
                        Actual Cost:
                      </span>
                      <span className="ml-2 text-green-900 dark:text-green-100">
                        OMR {(resource.rate * formData.actual_hours).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isEditing || isDeleting}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      <span>Delete Assignment</span>
                    </>
                  )}
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={isEditing || isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing || isDeleting}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Update Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetailModal;
