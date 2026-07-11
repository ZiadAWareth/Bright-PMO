import React, { useState, useMemo } from "react";
import { Calendar, Plus, Users, Search } from "lucide-react";
import axios from "axios";

interface ScheduleTask {
  task_id: number;
  name: string;
  description: string | null;
  wbs_id: number;
  start_date: string;
  end_date: string;
  duration: number;
  progress_percentage: number;
  is_milestone: boolean;
  is_critical_path: boolean;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "completed" | "on_hold";
  created_at: string;
  updated_at: string;
  estimated_hours: number;
  planned_hours: number;
  work_package: string | null;
  wbs?: {
    wbs_id: number;
    name: string;
    wbs_code: string;
    level: number;
  };
}

const ScheduleResourceAssignmentModal = ({
  scheduleId,
  task,
  resources,
  existingAssignments,
  onClose,
  onSave,
}: {
  scheduleId: number;
  task: ScheduleTask & {
    budgets?: Array<{
      planned_amount: number;
      actual_amount: number;
      cost_type: string;
    }>;
  };
  resources: any[];
  existingAssignments: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}) => {
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    resource_id: "",
    allocation_percentage: 100,
    start_date: formatDateForInput(task.start_date),
    end_date: formatDateForInput(task.end_date),
    planned_hours: task.estimated_hours || 8,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const availableResources = useMemo(() => {
    let filtered = resources.filter(
      (resource) =>
        resource.availability_status === "available" &&
        !existingAssignments.some(
          (assignment) => assignment.resource_id === resource.resource_id
        )
    );
    if (selectedResourceType) {
      filtered = filtered.filter(
        (resource) => resource.type === selectedResourceType
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (resource) =>
          resource.name.toLowerCase().includes(query) ||
          resource.role.toLowerCase().includes(query) ||
          resource.department.toLowerCase().includes(query) ||
          (resource.skills &&
            typeof resource.skills === "string" &&
            resource.skills.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [resources, existingAssignments, selectedResourceType, searchQuery]);

  const resourceTypes = useMemo(() => {
    const availableResourcesForCounting = resources.filter(
      (resource) =>
        resource.availability_status === "available" &&
        !existingAssignments.some(
          (assignment) => assignment.resource_id === resource.resource_id
        )
    );
    const typeCount = availableResourcesForCounting.reduce((acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(typeCount).sort(([a], [b]) => a.localeCompare(b));
  }, [resources, existingAssignments]);

  const handleInputChange = (field: string, value: any) => {
    if (field === "resource_id") {
      setFormData((prev) => ({ ...prev, [field]: String(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const resource_id_raw = formData.resource_id;
      if (!resource_id_raw || resource_id_raw === "") {
        setErrors({ general: "Please select a resource from the dropdown." });
        setIsSubmitting(false);
        return;
      }
      const resource_id = Number(resource_id_raw);
      const allocation_percentage = formData.allocation_percentage;
      const planned_hours = formData.planned_hours;
      const start_date = formData.start_date;
      const end_date = formData.end_date;
      const submitData = {
        resource_id,
        allocation_percentage,
        planned_hours,
        start_date,
        end_date,
      };
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await axios.post(
        `/api/schedules/${scheduleId}/tasks/${task.task_id}/assign-resource`,
        submitData,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (res.status === 201) {
        onSave(res.data);
        onClose();
      } else {
        setErrors({ general: res.data.error || "Failed to assign resource" });
      }
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message || "Failed to assign resource";
      setErrors({ general: backendError });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedResource = resources.find(
    (r) => r.resource_id === parseInt(formData.resource_id)
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg mx-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Assign Scheduled Resource
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Task: {task.name}
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
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Current Assignments
            </h3>
            <div className="space-y-2 mb-3">
              {existingAssignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-blue-800 dark:text-blue-200">
                    {assignment.resource.name} ({assignment.resource.role})
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {assignment.allocation_percentage}%  {assignment.planned_hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resource Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Scheduled Resource *
              </label>
              {/* Resource Type Filter */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Resource Type
                </label>
                <select
                  value={selectedResourceType}
                  onChange={(e) => {
                    setSelectedResourceType(e.target.value);
                    setFormData((prev) => ({ ...prev, resource_id: "" }));
                    setSearchQuery("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                >
                  <option value="">All Types</option>
                  {resourceTypes.map(([type, count]) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} ({count as number} available)
                    </option>
                  ))}
                </select>
              </div>
              {/* Search Bar */}
              <div className="mb-3 flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                />
              </div>
              <select
                value={formData.resource_id}
                onChange={(e) => handleInputChange("resource_id", e.target.value)}
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
                    value={String(resource.resource_id)}
                  >
                    {resource.name} - {resource.role} ({resource.type}) - ${resource.rate}/hr
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
                  {selectedResourceType || searchQuery
                    ? "No resources found matching your filters. Try adjusting the resource type or search criteria."
                    : "No available resources found. All resources may be assigned or unavailable."}
                </p>
              )}
            </div>
            {/* Assignment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assignment Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
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
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.end_date
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                  disabled={isSubmitting}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.end_date}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allocation Percentage *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.allocation_percentage}
                onChange={(e) => handleInputChange("allocation_percentage", parseInt(e.target.value))}
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Planned Hours *
              </label>
              <input
                type="number"
                min={1}
                value={formData.planned_hours}
                onChange={(e) => handleInputChange("planned_hours", parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
              />
            </div>
            {errors.general && (
              <p className="text-red-500 text-xs mt-1">{errors.general}</p>
            )}
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

export default ScheduleResourceAssignmentModal; 