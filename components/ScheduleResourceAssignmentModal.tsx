import React, { useState, useMemo } from "react";
import { Calendar, Plus, Users, Search } from "lucide-react";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";

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
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-lg mx-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-ink">
                Assign Scheduled Resource
              </h2>
              <p className="text-sm text-muted">
                Task: {task.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-2 rounded-lg"
              disabled={isSubmitting}
            >
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          {/* Existing Assignments */}
          <div className="mb-6 p-4 bg-info-soft border border-info rounded-lg">
            <h3 className="text-sm font-semibold text-info mb-2">
              Current Assignments
            </h3>
            <div className="space-y-2 mb-3">
              {existingAssignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-info">
                    {assignment.resource.name} ({assignment.resource.role})
                  </span>
                  <span className="text-info">
                    {assignment.allocation_percentage}%  {assignment.planned_hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resource Selection */}
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Select Scheduled Resource *
              </label>
              {/* Resource Type Filter */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-muted mb-1">
                  Resource Type
                </label>
                <Dropdown
                  value={String(selectedResourceType ?? '')}
                  onChange={(__v: string) => {
                    setSelectedResourceType(__v);
                    setFormData((prev) => ({ ...prev, resource_id: "" }));
                    setSearchQuery("");
                  }}
                  options={[
                  { value: String(""), label: "All Types" },
                  ...resourceTypes.map(([type, count]) => ({ value: String(type), label: `${type.charAt(0).toUpperCase() + type.slice(1)} (${count as number} available)` })),
                ]}
                  disabled={isSubmitting}
                  modal
                />
              </div>
              {/* Search Bar */}
              <div className="mb-3 flex items-center gap-2">
                <Search size={16} className="text-faint" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent bg-surface text-ink"
                  disabled={isSubmitting}
                />
              </div>
              <Dropdown
                value={String(formData.resource_id ?? '')}
                onChange={(__v: string) => handleInputChange("resource_id", __v)}
                options={[
                { value: String(""), label: "Choose a resource..." },
                ...availableResources.map((resource) => ({ value: String(String(resource.resource_id)), label: `${resource.name} - ${resource.role} (${resource.type}) - $${resource.rate}/hr` })),
              ]}
                disabled={isSubmitting}
                modal
              />
              {errors.resource_id && (
                <p className="text-danger text-xs mt-1">
                  {errors.resource_id}
                </p>
              )}
              {availableResources.length === 0 && (
                <p className="text-bright text-xs mt-1">
                  {selectedResourceType || searchQuery
                    ? "No resources found matching your filters. Try adjusting the resource type or search criteria."
                    : "No available resources found. All resources may be assigned or unavailable."}
                </p>
              )}
            </div>
            {/* Assignment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-1">
                  Assignment Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                    errors.start_date
                      ? "border-danger"
                      : "border-line"
                  } bg-surface  text-ink`}
                  disabled={isSubmitting}
                />
                {errors.start_date && (
                  <p className="text-danger text-xs mt-1">
                    {errors.start_date}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-1">
                  Assignment End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                    errors.end_date
                      ? "border-danger"
                      : "border-line"
                  } bg-surface  text-ink`}
                  disabled={isSubmitting}
                />
                {errors.end_date && (
                  <p className="text-danger text-xs mt-1">
                    {errors.end_date}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Allocation Percentage *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.allocation_percentage}
                onChange={(e) => handleInputChange("allocation_percentage", parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                  errors.allocation_percentage
                    ? "border-danger"
                    : "border-line"
                } bg-surface  text-ink`}
                disabled={isSubmitting}
              />
              {errors.allocation_percentage && (
                <p className="text-danger text-xs mt-1">
                  {errors.allocation_percentage}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Planned Hours *
              </label>
              <input
                type="number"
                min={1}
                value={formData.planned_hours}
                onChange={(e) => handleInputChange("planned_hours", parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent bg-surface text-ink"
                disabled={isSubmitting}
              />
            </div>
            {errors.general && (
              <p className="text-danger text-xs mt-1">{errors.general}</p>
            )}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-ink-3 hover:bg-surface-2 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || availableResources.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-info text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size={16} />
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