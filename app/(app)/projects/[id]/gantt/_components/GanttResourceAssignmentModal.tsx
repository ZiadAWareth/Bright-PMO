"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Users, Plus } from "lucide-react";
import { GanttTask } from "./types";

interface GanttResourceAssignmentModalProps {
  task: GanttTask | null;
  resources: any[];
  existingAssignments: any[];
  allTasks: GanttTask[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const GanttResourceAssignmentModal = ({
  task,
  resources,
  existingAssignments,
  allTasks,
  onClose,
  onSave,
}: GanttResourceAssignmentModalProps) => {
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(task);
  const [formData, setFormData] = useState({
    task_id: task?.id || "",
    resource_id: "",
    allocation_percentage: 100,
    start_date: task?.startDate.toISOString().split("T")[0] || "",
    end_date: task?.endDate.toISOString().split("T")[0] || "",
    planned_hours: task?.estimatedEffort || 8,
    actual_hours: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTaskAssignments, setCurrentTaskAssignments] = useState<any[]>(
    []
  );

  useEffect(() => {
    if (selectedTask) {
      const taskId = parseInt(selectedTask.id.replace("task-", ""));
      const filteredAssignments = existingAssignments.filter(
        (assignment) => assignment.task_id === taskId
      );
      setCurrentTaskAssignments(filteredAssignments);
    } else {
      setCurrentTaskAssignments([]);
    }
  }, [selectedTask, existingAssignments]);

  const availableResources = resources.filter(
    (resource) =>
      resource.availability_status === "available" &&
      !currentTaskAssignments.some(
        (assignment) => assignment.resource_id === resource.resource_id
      )
  );

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      if (field === "task_id") {
        const newSelectedTask = allTasks.find((t) => t.id === value);
        setSelectedTask(newSelectedTask || null);

        if (newSelectedTask) {
          newData.start_date = newSelectedTask.startDate
            .toISOString()
            .split("T")[0];
          newData.end_date = newSelectedTask.endDate
            .toISOString()
            .split("T")[0];
          newData.planned_hours = newSelectedTask.estimatedEffort || 8;
        }
      }

      return newData;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const calculateRequiredHours = (
    startDate: string,
    endDate: string,
    dailyWorkingHours: number = 8
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    const totalRequiredHours = daysDiff * dailyWorkingHours;

    return {
      startDate: start,
      endDate: end,
      durationInDays: daysDiff,
      dailyWorkingHours: dailyWorkingHours,
      totalRequiredHours: totalRequiredHours,
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.task_id) {
      newErrors.task_id = "Please select a task";
    }

    if (!formData.resource_id) {
      newErrors.resource_id = "Please select a resource";
    }

    const selectedResource = availableResources.find(
      (r) => r.resource_id === parseInt(formData.resource_id)
    );

    if (
      selectedResource &&
      selectedResource.availability_status !== "available"
    ) {
      newErrors.resource_id =
        "Selected resource is not available for assignments";
    }

    if (
      formData.allocation_percentage < 1 ||
      formData.allocation_percentage > 100
    ) {
      newErrors.allocation_percentage =
        "Allocation must be between 1% and 100%";
    }

    if (selectedResource && currentTaskAssignments.length > 0) {
      const totalExistingAllocation = currentTaskAssignments.reduce(
        (sum, assignment) => sum + assignment.allocation_percentage,
        0
      );
      const newTotalAllocation =
        totalExistingAllocation + formData.allocation_percentage;

      if (newTotalAllocation > 100) {
        newErrors.allocation_percentage = `Total allocation would exceed 100% (current: ${totalExistingAllocation}%, adding: ${formData.allocation_percentage}%, total: ${newTotalAllocation}%)`;
      }
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

    if (formData.start_date && formData.end_date && selectedTask) {
      const assignmentStartDate = new Date(formData.start_date);
      const assignmentEndDate = new Date(formData.end_date);
      const taskStartDate = new Date(selectedTask.startDate);
      const taskEndDate = new Date(selectedTask.endDate);

      if (assignmentStartDate < taskStartDate) {
        newErrors.start_date = `Assignment start date cannot be before task start date (${selectedTask.startDate.toLocaleDateString(
          "en-GB"
        )})`;
      }

      if (assignmentEndDate > taskEndDate) {
        newErrors.end_date = `Assignment end date cannot be after task end date (${selectedTask.endDate.toLocaleDateString(
          "en-GB"
        )})`;
      }
    }

    if (formData.planned_hours < 0) {
      newErrors.planned_hours = "Planned hours cannot be negative";
    }

    if (
      formData.start_date &&
      formData.end_date &&
      formData.planned_hours > 0
    ) {
      const requiredHours = calculateRequiredHours(
        formData.start_date,
        formData.end_date,
        selectedResource && selectedResource.capacity
          ? selectedResource.capacity
          : 24
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);

      const submitData = {
        ...formData,
        task_id: parseInt(formData.task_id.replace("task-", "")),
        resource_id: parseInt(formData.resource_id),
        allocation_percentage: formData.allocation_percentage,
        planned_hours: formData.planned_hours,
        actual_hours: formData.actual_hours,
      };

      await onSave(submitData);
      setIsSubmitting(false);
    }
  };

  const selectedResource = resources.find(
    (r) => r.resource_id === parseInt(formData.resource_id)
  );
  console.log("Existing Assignments:", existingAssignments);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Assign Resource
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTask
                  ? `Task: ${selectedTask.name}`
                  : "Select a task to assign resources"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              disabled={isSubmitting}
            >
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          {/* Existing Assignments */}
          {currentTaskAssignments.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Current Assignments
              </h3>
              <div className="space-y-2 mb-3">
                {currentTaskAssignments.map((assignment) => (
                  <div
                    key={assignment.assignment_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-blue-800 dark:text-blue-200">
                      {assignment.resource.name} ({assignment.resource.role})
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {assignment.allocation_percentage}% •{" "}
                      {assignment.planned_hours}h
                    </span>
                  </div>
                ))}
              </div>

              {/* Allocation tracking summary */}
              {(() => {
                const totalAllocated = currentTaskAssignments.reduce(
                  (sum, assignment) => sum + assignment.allocation_percentage,
                  0
                );
                const remainingAllocation = 100 - totalAllocated;
                return (
                  <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-800 dark:text-blue-200 font-medium">
                        Total Allocated:
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {totalAllocated}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-blue-800 dark:text-blue-200 font-medium">
                        Remaining:
                      </span>
                      <span
                        className={`font-medium ${
                          remainingAllocation > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {remainingAllocation}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            totalAllocated <= 100 ? "bg-blue-500" : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(totalAllocated, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                        {totalAllocated}% of 100% allocated
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Task *
              </label>
              <select
                value={formData.task_id}
                onChange={(e) => handleInputChange("task_id", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.task_id
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                disabled={isSubmitting}
              >
                <option value="">Choose a task...</option>
                {allTasks
                  .filter((t) => !t.isMilestone)
                  .map((taskOption) => (
                    <option key={taskOption.id} value={taskOption.id}>
                      {taskOption.wbsId} - {taskOption.name} (
                      {taskOption.estimatedEffort}h)
                    </option>
                  ))}
              </select>
              {errors.task_id && (
                <p className="text-red-500 text-xs mt-1">{errors.task_id}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Select the task you want to assign resources to. Only work tasks
                are shown (milestones excluded).
              </p>
            </div>

            {/* Resource Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Resource *
              </label>
              <select
                value={formData.resource_id}
                onChange={(e) =>
                  handleInputChange("resource_id", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.resource_id
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                disabled={isSubmitting}
              >
                <option value="">Choose a resource...</option>
                {availableResources.map((resource) => (
                  <option
                    key={resource.resource_id}
                    value={resource.resource_id}
                  >
                    {resource.name} - {resource.role} ({resource.type}) - $
                    {resource.rate}/hr
                  </option>
                ))}
              </select>
              {errors.resource_id && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.resource_id}
                </p>
              )}
              {availableResources.length === 0 && (
                <p className="text-orange-600 text-xs mt-1">
                  No available resources found. All resources may be assigned or
                  unavailable.
                </p>
              )}
            </div>

            {/* Information Panel About Assignment Rules */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Resource Assignment Guidelines
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Working Hours:</strong> The system uses a standard
                    8-hour workday for planning purposes.
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Date Range:</strong> If assigning more than 8 hours,
                    increase the date range (e.g., 2+ days for 9+ hours).
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Allocation Limit:</strong> Total allocation
                    percentage across all resources for this task cannot exceed
                    100%.
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Resource Capacity:</strong> Even if a resource has
                    higher capacity (e.g., 12h/day), the 8-hour workday
                    validation still applies.
                  </span>
                </li>
              </ul>
            </div>

            {/* Resource Details */}
            {selectedResource && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Resource Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Department:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedResource.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Skills:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {typeof selectedResource.skills === "object"
                        ? Object.entries(selectedResource.skills)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")
                        : selectedResource.skills}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Rate:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      ${selectedResource.rate}/hr
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Status:
                    </span>
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      {selectedResource.availability_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Capacity:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedResource.capacity || 8}
                      h/day
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Type:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedResource.type}
                    </span>
                  </div>
                </div>

                {/* Capacity calculation for assignment period */}
                {formData.start_date && formData.end_date && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-xs text-blue-800 dark:text-blue-200">
                      <div className="font-medium mb-1">
                        Capacity for Assignment Period:
                      </div>
                      {(() => {
                        const requiredHours = calculateRequiredHours(
                          formData.start_date,
                          formData.end_date
                        );
                        const totalCapacity =
                          (selectedResource.capacity || 8) *
                          requiredHours.durationInDays;
                        return (
                          <div>
                            • Duration: {requiredHours.durationInDays} days
                            <br />• Total Capacity: {totalCapacity}h (
                            {selectedResource.capacity || 8}
                            h/day × {requiredHours.durationInDays} days)
                            <br />• Available Working Time:{" "}
                            {requiredHours.totalRequiredHours}h (8h/day ×{" "}
                            {requiredHours.durationInDays} days)
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Allocation Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allocation Percentage *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.allocation_percentage}
                onChange={(e) =>
                  handleInputChange(
                    "allocation_percentage",
                    parseInt(e.target.value) || 100
                  )
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.allocation_percentage
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                disabled={isSubmitting}
              />
              {errors.allocation_percentage && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.allocation_percentage}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Percentage allocation of this resource to the task. Independent
                from planned hours.
              </p>

              {/* Real-time allocation tracking */}
              {currentTaskAssignments.length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                  {(() => {
                    const currentTotal = currentTaskAssignments.reduce(
                      (sum, assignment) =>
                        sum + assignment.allocation_percentage,
                      0
                    );
                    const newTotal =
                      currentTotal + (formData.allocation_percentage || 0);
                    const remaining = 100 - newTotal;

                    return (
                      <div className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 dark:text-gray-400">
                            Current total: {currentTotal}%
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Adding: {formData.allocation_percentage || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span
                            className={
                              newTotal <= 100
                                ? "text-gray-800 dark:text-gray-200"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            New total: {newTotal}%
                          </span>
                          <span
                            className={
                              remaining >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {remaining >= 0
                              ? `${remaining}% remaining`
                              : `Over by ${Math.abs(remaining)}%`}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                newTotal <= 100 ? "bg-blue-500" : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(newTotal, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Assignment Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignment Start Date *
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
                  disabled={isSubmitting}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.start_date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignment End Date *
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
                  disabled={isSubmitting}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Show Task date constraints */}
            {selectedTask && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar
                    size={14}
                    className="text-orange-600 dark:text-orange-400"
                  />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Task Date Constraints
                  </span>
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300">
                  <div>
                    • Assignment must start on or after:{" "}
                    {selectedTask.startDate.toLocaleDateString("en-GB")}
                  </div>
                  <div>
                    • Assignment must end on or before:{" "}
                    {selectedTask.endDate.toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>
            )}

            {/* Planned Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Planned Hours *
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.planned_hours
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                disabled={isSubmitting}
              />
              {errors.planned_hours && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.planned_hours}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Total hours planned for this assignment
                {selectedTask
                  ? ` (out of ${selectedTask.estimatedEffort}h)`
                  : ""}
                . Changing this will automatically update allocation percentage.
              </p>
            </div>

            {/* Cost Estimation */}
            {selectedResource && formData.planned_hours > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                  Cost Estimation
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Estimated Cost: $
                  {(selectedResource.rate * formData.planned_hours).toFixed(2)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  ({formData.planned_hours}h × ${selectedResource.rate}/hr)
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || availableResources.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <Users size={16} />
                    <span>Assign Resource</span>
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

export default GanttResourceAssignmentModal;
