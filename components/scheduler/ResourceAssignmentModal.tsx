import React, { useState, useMemo, useEffect } from "react";
import { Calendar, Plus, Users, Search, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";

interface Task {
  task_id: number;
  name: string;
  description: string | null;
  wbs_id: number;
  start_date: string;
  end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  duration: number;
  progress_percentage: number;
  is_milestone: boolean;
  is_critical_path: boolean;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "completed" | "on_hold";
  created_at: string;
  updated_at: string;
  estimated_hours: number;
  actual_hours: number;
  work_package: string | null;
  wbs: {
    wbs_id: number;
    name: string;
    wbs_code: string;
    level: number;
  };
}

const ResourceAssignmentModal = ({
  task,
  resources,
  existingAssignments,
  onClose,
  onSave,
}: {
  task: Task & {
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
  // Helper function to format date to MM-DD-YYYY
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US"); // MM/DD/YYYY format
  };

  // Helper function to convert date to YYYY-MM-DD format for input fields
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  const [formData, setFormData] = useState({
    resource_id: "",
    allocation_percentage: 100,
    start_date: formatDateForInput(task.start_date),
    end_date: formatDateForInput(task.end_date),
    planned_hours: task.estimated_hours || 8,
    actual_hours: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [periodAvailability, setPeriodAvailability] = useState<{
    total_capacity_hours: number;
    total_planned_hours: number;
    planned_utilization_rate: number;
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const availableResources = useMemo(() => {
    let filtered = resources.filter(
      (resource) =>
        resource.availability_status === "available" &&
        !existingAssignments.some(
          (assignment) => assignment.resource_id === resource.resource_id
        )
    );

    // Filter by resource type if selected
    if (selectedResourceType) {
      filtered = filtered.filter(
        (resource) => resource.type === selectedResourceType
      );
    }

    // Filter by search query if provided
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

  // Fetch resource availability in selected period (equipment and labour)
  const resourceId = formData.resource_id ? parseInt(formData.resource_id, 10) : null;

  useEffect(() => {
    const start = formData.start_date;
    const end = formData.end_date;
    const validDates = start && end && new Date(start) <= new Date(end);
    if (!resourceId || !validDates) {
      setPeriodAvailability(null);
      setAvailabilityError(null);
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    const params = new URLSearchParams({ start_date: start, end_date: end });
    fetch(`/api/resources/${resourceId}/workload?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load availability");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const u = data?.utilization_summary;
        if (u != null) {
          setPeriodAvailability({
            total_capacity_hours: u.total_capacity_hours ?? 0,
            total_planned_hours: u.total_planned_hours ?? 0,
            planned_utilization_rate: u.planned_utilization_rate ?? 0,
          });
        } else {
          setPeriodAvailability(null);
        }
        setAvailabilityError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setPeriodAvailability(null);
          setAvailabilityError("Could not load availability");
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, formData.start_date, formData.end_date]);

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
    if (field === "start_date" || field === "end_date") {
      // Handle date input changes - directly use the value from input (YYYY-MM-DD format)
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };

        // Auto-calculate allocation percentage when planned hours change
        // Formula: Allocation % = (Planned Hours / Task Estimated Hours) × 100
        if (field === "planned_hours" && task.estimated_hours > 0) {
          const newAllocation = Math.round((value / task.estimated_hours) * 100);
          newData.allocation_percentage = Math.min(100, Math.max(1, newAllocation));
        }

        // Auto-calculate planned hours when allocation percentage changes
        // Formula: Planned Hours = (Allocation % / 100) × Task Estimated Hours
        if (field === "allocation_percentage" && task.estimated_hours > 0) {
          const newPlannedHours = Math.round((value / 100) * task.estimated_hours * 10) / 10; // Round to 1 decimal
          newData.planned_hours = Math.max(0.5, newPlannedHours);
        }

        return newData;
      });
    }

    // Clear errors for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Working days (exclude weekends) — must match backend workload API so capacity numbers align
  const calculateWorkingDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const calculateRequiredHours = (
    startDate: string,
    endDate: string,
    dailyWorkingHours: number = 8
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const workingDays = calculateWorkingDays(startDate, endDate);
    const totalRequiredHours = workingDays * dailyWorkingHours;
    return {
      startDate: start,
      endDate: end,
      durationInDays: workingDays,
      dailyWorkingHours: dailyWorkingHours,
      totalRequiredHours: totalRequiredHours,
    };
  };

  const calculateBudgetInfo = () => {
    // Debug: Log the task budgets to understand the structure
    console.log("Task budgets:", task);

    // Get task budgets - sum all planned amounts from the budgets array
    const totalPlannedBudget =
      task.budgets?.reduce((total, budget) => {
        console.log(
          "Processing budget:",
          budget,
          "planned_amount:",
          budget.planned_amount
        );
        return total + (budget.planned_amount || 0);
      }, 0) || 0;

    console.log("Total planned budget calculated:", totalPlannedBudget);

    // Calculate current cost of existing assignments
    const currentCost = existingAssignments.reduce((total, assignment) => {
      const assignmentCost = (assignment.planned_hours || 0) * (assignment.resource?.rate || 0);
      return total + assignmentCost;
    }, 0);

    // Calculate new assignment cost
    const selectedResource = resources.find(
      (r) => r.resource_id === parseInt(formData.resource_id)
    );
    const newAssignmentCost =
      selectedResource && formData.planned_hours > 0 && selectedResource.rate
        ? (selectedResource.rate || 0) * (formData.planned_hours || 0)
        : 0;

    const totalCostWithNew = currentCost + newAssignmentCost;
    const budgetRemaining = totalPlannedBudget - currentCost;
    const wouldExceedBudget = totalCostWithNew > totalPlannedBudget;
    const budgetExcess = totalCostWithNew - totalPlannedBudget;

    return {
      plannedBudget: totalPlannedBudget,
      currentCost,
      newAssignmentCost,
      totalCostWithNew,
      budgetRemaining,
      wouldExceedBudget,
      budgetExcess: Math.max(0, budgetExcess),
      hasBudget: totalPlannedBudget > 0,
    };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.resource_id) {
      newErrors.resource_id = "Please select a resource";
    }

    const selectedResource = availableResources.find(
      (r) => r.resource_id === parseInt(formData.resource_id)
    );

    // Resource availability validation (frontend check)
    if (
      selectedResource &&
      selectedResource.availability_status !== "available"
    ) {
      newErrors.resource_id =
        "Selected resource is not available for assignments";
    }

    const isMaterial = selectedResource?.type === "material";

    // Allocation percentage validation (skip for materials — use default on submit)
    if (!isMaterial) {
      if (
        formData.allocation_percentage < 1 ||
        formData.allocation_percentage > 100
      ) {
        newErrors.allocation_percentage =
          "Allocation must be between 1% and 100%";
      }
      if (selectedResource && existingAssignments.length > 0) {
        const totalExistingAllocation = existingAssignments.reduce(
          (sum, assignment) => sum + (assignment.allocation_percentage || 0),
          0
        );
        const newTotalAllocation =
          totalExistingAllocation + formData.allocation_percentage;
        if (newTotalAllocation > 100) {
          newErrors.allocation_percentage = `Total allocation would exceed 100% (current: ${totalExistingAllocation}%, adding: ${formData.allocation_percentage}%, total: ${newTotalAllocation}%)`;
        }
      }
    }

    // Date validation (skip for materials — use task dates on submit)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isMaterial) {
      if (!formData.start_date) {
        newErrors.start_date = "Start date is required";
      } else if (!dateRegex.test(formData.start_date)) {
        newErrors.start_date = "Please enter a valid date";
      } else {
        const testDate = new Date(formData.start_date);
        if (isNaN(testDate.getTime())) {
          newErrors.start_date = "Please enter a valid date";
        }
      }
      if (!formData.end_date) {
        newErrors.end_date = "End date is required";
      } else if (!dateRegex.test(formData.end_date)) {
        newErrors.end_date = "Please enter a valid date";
      } else {
        const testDate = new Date(formData.end_date);
        if (isNaN(testDate.getTime())) {
          newErrors.end_date = "Please enter a valid date";
        }
      }
      if (
        formData.start_date &&
        formData.end_date &&
        !newErrors.start_date &&
        !newErrors.end_date
      ) {
        if (new Date(formData.start_date) > new Date(formData.end_date)) {
          newErrors.end_date = "End date must be after start date";
        }
      }
      if (
        formData.start_date &&
        formData.end_date &&
        !newErrors.start_date &&
        !newErrors.end_date
      ) {
        const assignmentStartDate = new Date(formData.start_date);
        const assignmentEndDate = new Date(formData.end_date);
        const taskStartDate = new Date(task.start_date);
        const taskEndDate = new Date(task.end_date);
        if (assignmentStartDate < taskStartDate) {
          newErrors.start_date = `Assignment start date cannot be before task start date (${formatDateForDisplay(task.start_date)})`;
        }
        if (assignmentEndDate > taskEndDate) {
          newErrors.end_date = `Assignment end date cannot be after task end date (${formatDateForDisplay(task.end_date)})`;
        }
      }
    }

    if (formData.planned_hours < 0) {
      newErrors.planned_hours = "Planned hours cannot be negative";
    }

    // Resource period capacity: do not exceed available capacity in this date range
    if (
      periodAvailability &&
      formData.planned_hours > 0
    ) {
      const { total_capacity_hours, total_planned_hours } = periodAvailability;
      const wouldBeTotal = total_planned_hours + formData.planned_hours;
      if (wouldBeTotal > total_capacity_hours) {
        const available = Math.max(0, total_capacity_hours - total_planned_hours);
        newErrors.planned_hours = `Resource is over-allocated in this period (${total_planned_hours.toFixed(1)}h already allocated, ${available.toFixed(1)}h available; adding ${formData.planned_hours}h would exceed capacity of ${total_capacity_hours.toFixed(1)}h).`;
      }
    }

    // Remove the planned hours vs estimated hours restriction
    // Each resource can now have their own planned hours independent of task estimated hours
    // The validation logic should be based on resource capacity and availability instead

    // Advanced validations matching backend logic
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
      ); // Use resource capacity or 24h max

      // We're not validating against daily hours anymore
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);

      const selectedRes = resources.find(
        (r) => r.resource_id === parseInt(formData.resource_id)
      );
      const isMaterial = selectedRes?.type === "material";

      const submitData = {
        ...formData,
        task_id: task.task_id,
        resource_id: parseInt(formData.resource_id),
        allocation_percentage: isMaterial
          ? 100
          : formData.allocation_percentage,
        start_date: isMaterial
          ? formatDateForInput(task.start_date)
          : formData.start_date,
        end_date: isMaterial
          ? formatDateForInput(task.end_date)
          : formData.end_date,
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
      <div className="bg-surface rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-ink">
                Assign Resource
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
          {existingAssignments.length > 0 && (
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
                      {assignment.resource?.name || 'Unknown Resource'} ({assignment.resource?.role || 'N/A'})
                    </span>
                    <span className="text-info">
                      {assignment.allocation_percentage || 0}% •{" "}
                      {assignment.planned_hours || 0}h
                    </span>
                  </div>
                ))}
              </div>

              {/* Allocation tracking summary */}
              {(() => {
                const totalAllocated = existingAssignments.reduce(
                  (sum, assignment) => sum + (assignment.allocation_percentage || 0),
                  0
                );
                const remainingAllocation = 100 - totalAllocated;
                return (
                  <div className="border-t border-info pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-info font-medium">
                        Total Allocated:
                      </span>
                      <span className="text-info">
                        {totalAllocated}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-info font-medium">
                        Remaining:
                      </span>
                      <span
                        className={`font-medium ${
                          remainingAllocation > 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {remainingAllocation}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="w-full bg-surface-3 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            totalAllocated <= 100 ? "bg-info" : "bg-danger"
                          }`}
                          style={{ width: `${Math.min(totalAllocated, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted mt-1 text-center">
                        {totalAllocated}% of 100% allocated
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resource Selection */}
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                Select Resource *
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
                    setFormData((prev) => ({ ...prev, resource_id: "" })); // Clear selected resource when type changes
                    setSearchQuery(""); // Clear search when type changes
                  }}
                  options={[
                  { value: String(""), label: "All Types" },
                  ...resourceTypes.map(([type, count]) => ({ value: String(type), label: `${type.charAt(0).toUpperCase() + type.slice(1)} ( ${count as number} available)` })),
                ]}
                  disabled={isSubmitting}
                  modal
                />
              </div>

              {/* Search Bar */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-muted mb-1">
                  Search Resources
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-faint h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name, role, department, or skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-info focus:border-transparent bg-surface text-ink"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Resource Dropdown */}
              <div className="mb-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-muted">
                    Available Resources
                  </label>
                  <span className="text-xs text-muted">
                    {availableResources.length} resource
                    {availableResources.length !== 1 ? "s" : ""} found
                  </span>
                </div>
              </div>
              <Dropdown
                value={String(formData.resource_id ?? '')}
                onChange={(__v: string) =>
                  handleInputChange("resource_id", __v)}
                options={[
                { value: String(""), label: "Choose a resource..." },
                ...availableResources.map((resource) => ({ value: String(resource.resource_id), label: `${resource.name} - ${resource.role} (${resource.type}) - OMR${" "} ${resource.rate.toFixed(2)}/ ${resource.type === "material" ? (resource.unit || "kg") : "hr"}` })),
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

            {/* Information Panel About Assignment Rules */}
            <div className="p-4 bg-info-soft border border-info rounded-lg">
              <h4 className="text-sm font-semibold text-info flex items-center mb-2">
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
              <ul className="text-xs text-info space-y-2">
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
              <div className="p-3 bg-surface-2 rounded-lg">
                <h4 className="text-sm font-medium text-ink mb-2">
                  Resource Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted">
                      Department:
                    </span>
                    <span className="ml-2 text-ink">
                      {selectedResource.department}
                    </span>
                  </div>
                  {selectedResource.type !== "material" && (
                    <div>
                      <span className="text-muted">
                        Skills:
                      </span>
                      <span className="ml-2 text-ink">
                        {typeof selectedResource.skills === "object" && selectedResource.skills !== null
                          ? Object.entries(selectedResource.skills)
                              .filter(([key, value]) => value === true)
                              .map(([key]) => {
                                return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                              })
                              .join(", ")
                          : selectedResource.skills || "None"}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted">
                      {selectedResource.type === "material" ? "Cost" : "Rate"}:
                    </span>
                    <span className="ml-2 text-ink">
                      OMR {selectedResource.rate.toFixed(2)}/
                      {selectedResource.type === "material"
                        ? (selectedResource.unit || "kg")
                        : "hr"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">
                      Status:
                    </span>
                    <span className="ml-2 text-success">
                      {selectedResource.availability_status}
                    </span>
                  </div>
                  {selectedResource.type !== "material" && (
                    <div>
                      <span className="text-muted">
                        Capacity:
                      </span>
                      <span className="ml-2 text-ink">
                        {selectedResource.capacity || 8}h/day
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted">
                      Type:
                    </span>
                    <span className="ml-2 text-ink">
                      {selectedResource.type}
                    </span>
                  </div>
                </div>

                {/* Capacity calculation for assignment period (equipment & labour only) */}
                {selectedResource.type !== "material" &&
                  formData.start_date &&
                  formData.end_date && (
                  <div className="mt-3 p-2 bg-info-soft border border-info rounded-lg">
                    <div className="text-xs text-info">
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
                            • Working days in period:{" "}
                            {requiredHours.durationInDays} (weekends excluded)
                            <br />• Total capacity: {totalCapacity}h (
                            {selectedResource.capacity || 8}h/day × 100% ×{" "}
                            {requiredHours.durationInDays} working days)
                            <br />• 100% capacity = {selectedResource.capacity || 8}h per working day
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Real-time availability in this period (equipment & labour only) */}
                {selectedResource.type !== "material" &&
                  formData.start_date &&
                  formData.end_date && (
                  <div className="mt-3">
                    {availabilityLoading && (
                      <p className="text-xs text-muted">
                        Checking availability…
                      </p>
                    )}
                    {availabilityError && (
                      <p className="text-xs text-warning">
                        {availabilityError}
                      </p>
                    )}
                    {!availabilityLoading && !availabilityError && periodAvailability && (
                      <div className="p-2 rounded-lg border text-xs bg-surface-2 border-line">
                        <div className="font-medium text-ink-2 mb-1">
                          Availability in this period
                        </div>
                        <div className="text-ink-3 space-y-0.5">
                          <div>
                            Already allocated:{" "}
                            <strong>{periodAvailability.total_planned_hours.toFixed(1)}h</strong> (
                            {periodAvailability.planned_utilization_rate.toFixed(1)}% of capacity)
                          </div>
                          <div>
                            Available:{" "}
                            <strong>
                              {Math.max(
                                0,
                                periodAvailability.total_capacity_hours -
                                  periodAvailability.total_planned_hours
                              ).toFixed(1)}h
                            </strong>{" "}
                            (
                            {(100 - periodAvailability.planned_utilization_rate).toFixed(1)}%
                            remaining)
                          </div>
                        </div>
                        {periodAvailability.total_planned_hours + formData.planned_hours >
                          periodAvailability.total_capacity_hours &&
                          formData.planned_hours > 0 && (
                            <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-danger-soft border border-danger text-danger">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>
                                This assignment would exceed available capacity in this period.
                                Reduce planned hours or choose another period.
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Allocation Percentage (hidden for materials) */}
            {selectedResource?.type !== "material" && (
              <div>
                <label className="block text-sm font-medium text-ink-3 mb-1">
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
                <p className="text-xs text-muted mt-1">
                  Percentage allocation of this resource to the task. Independent
                  from planned hours.
                </p>

                {/* Real-time allocation tracking */}
                {existingAssignments.length > 0 && (
                  <div className="mt-2 p-2 bg-surface-2 rounded border">
                    {(() => {
                      const currentTotal = existingAssignments.reduce(
                        (sum, assignment) =>
                          sum + (assignment.allocation_percentage || 0),
                        0
                      );
                      const newTotal =
                        currentTotal + (formData.allocation_percentage || 0);
                      const remaining = 100 - newTotal;

                      return (
                        <div className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-muted">
                              Current total: {currentTotal}%
                            </span>
                            <span className="text-muted">
                              Adding: {formData.allocation_percentage || 0}%
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span
                              className={
                                newTotal <= 100
                                  ? "text-ink-2"
                                  : "text-danger"
                              }
                            >
                              New total: {newTotal}%
                            </span>
                            <span
                              className={
                                remaining >= 0
                                  ? "text-success"
                                  : "text-danger"
                              }
                            >
                              {remaining >= 0
                                ? `${remaining}% remaining`
                                : `Over by ${Math.abs(remaining)}%`}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1">
                            <div className="w-full bg-surface-3 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  newTotal <= 100 ? "bg-info" : "bg-danger"
                                }`}
                                style={{ width: `${Math.min(newTotal, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Assignment Date Range (hidden for materials) */}
            {selectedResource?.type !== "material" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-3 mb-1">
                      Assignment Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        handleInputChange("start_date", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleInputChange("end_date", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                        errors.end_date
                          ? "border-danger"
                          : "border-line"
                      } bg-surface  text-ink`}
                      disabled={isSubmitting}
                    />
                    {errors.end_date && (
                      <p className="text-danger text-xs mt-1">{errors.end_date}</p>
                    )}
                  </div>
                </div>

                {/* Show Task date constraints */}
                <div className="p-3 bg-bright-soft border border-bright rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Calendar
                      size={14}
                      className="text-bright"
                    />
                    <span className="text-sm font-medium text-bright">
                      Task Date Constraints
                    </span>
                  </div>
                  <div className="text-xs text-bright-deep">
                    <div>
                      • Assignment must start on or after:{" "}
                      {formatDateForDisplay(task.start_date)}
                    </div>
                    <div>
                      • Assignment must end on or before:{" "}
                      {formatDateForDisplay(task.end_date)}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Planned Hours (equipment/labour) or Quantity (material) */}
            <div>
              <label className="block text-sm font-medium text-ink-3 mb-1">
                {selectedResource?.type === "material"
                  ? `Quantity (${selectedResource?.unit || "kg"}) *`
                  : "Planned Hours *"}
              </label>
              <input
                type="number"
                min="0"
                step={selectedResource?.type === "material" ? "1" : "0.5"}
                value={formData.planned_hours}
                onChange={(e) =>
                  handleInputChange(
                    "planned_hours",
                    parseFloat(e.target.value) || 0
                  )
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-info focus:border-transparent ${
                  errors.planned_hours
                    ? "border-danger"
                    : "border-line"
                } bg-surface  text-ink`}
                disabled={isSubmitting}
              />
              {errors.planned_hours && (
                <p className="text-danger text-xs mt-1">
                  {errors.planned_hours}
                </p>
              )}
              <p className="text-xs text-muted mt-1">
                {selectedResource?.type === "material"
                  ? `Amount of material for this assignment. Cost = quantity × rate per ${selectedResource?.unit || "kg"}.`
                  : `Total hours planned for this assignment (out of ${task.estimated_hours}h). Changing this will automatically update allocation percentage.`}
              </p>
            </div>

            {/* Cost Estimation with Budget Validation */}
            {selectedResource && formData.planned_hours > 0 && (
              <div className="space-y-3">
                {/* Cost Estimation */}
                <div className="p-3 bg-success-soft border border-success rounded-lg">
                  <h4 className="text-sm font-medium text-success mb-1">
                    Cost Estimation
                  </h4>
                  <p className="text-sm text-success">
                    Estimated Cost: OMR{" "}
                    {((selectedResource?.rate || 0) * (formData.planned_hours || 0)).toFixed(
                      2
                    )}
                  </p>
                  <p className="text-xs text-success">
                    {selectedResource?.type === "material"
                      ? `(${formData.planned_hours || 0} ${selectedResource?.unit || "kg"} × OMR ${(selectedResource?.rate || 0).toFixed(2)}/${selectedResource?.unit || "kg"})`
                      : `(${formData.planned_hours || 0}h × OMR ${(selectedResource?.rate || 0).toFixed(2)}/hr)`}
                  </p>
                </div>

                {/* Budget Analysis */}
                {(() => {
                  const budgetInfo = calculateBudgetInfo();

                  if (!budgetInfo.hasBudget) {
                    return (
                      <div className="p-3 bg-surface-2 border border-line rounded-lg">
                        <h4 className="text-sm font-medium text-ink-3 mb-1">
                          Budget Information
                        </h4>
                        <p className="text-xs text-muted">
                          No budget has been set for this task.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={`p-3 rounded-lg border ${
                        budgetInfo.wouldExceedBudget
                          ? "bg-danger-soft border-danger "
                          : "bg-info-soft border-info "
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        {budgetInfo.wouldExceedBudget ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1 text-danger"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1 text-info"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                        <h4
                          className={`text-sm font-medium ${
                            budgetInfo.wouldExceedBudget
                              ? "text-danger "
                              : "text-info "
                          }`}
                        >
                          Budget Analysis
                        </h4>
                      </div>

                      {/* Budget Overview Section */}
                      <div className="space-y-2 text-xs mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-ink-3 font-medium">
                            Task Budget (Total Available):
                          </span>
                          <span className="font-semibold text-ink">
                            OMR {budgetInfo.plannedBudget.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Current State Section */}
                      <div className="border-t border-current/20 pt-2 mb-2">
                        <div className="text-xs font-medium text-muted mb-1.5">
                          Current Allocations:
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted">
                              Existing Assignments:
                            </span>
                            <span className="font-medium">
                              OMR {budgetInfo.currentCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">
                              This Assignment:
                            </span>
                            <span className="font-medium">
                              OMR {budgetInfo.newAssignmentCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Calculation Section */}
                      <div className="border-t border-current/20 pt-2">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-1">
                              <span className="text-muted font-medium">
                                Total Cost (All Assignments):
                              </span>
                              <span className="text-faint text-[10px]">
                                (Existing + This)
                              </span>
                            </div>
                            <span className={`font-semibold ${
                              budgetInfo.wouldExceedBudget
                                ? "text-danger"
                                : "text-info"
                            }`}>
                              OMR {budgetInfo.totalCostWithNew.toFixed(2)}
                            </span>
                          </div>

                          {/* Visual calculation helper */}
                          <div className="text-[10px] text-muted pl-2 border-l-2 border-line">
                            {(budgetInfo.currentCost || 0).toFixed(2)} + {(budgetInfo.newAssignmentCost || 0).toFixed(2)} = {(budgetInfo.totalCostWithNew || 0).toFixed(2)}
                          </div>
                        </div>

                        {/* Budget Status */}
                        {budgetInfo.wouldExceedBudget ? (
                          <div className="mt-2 pt-2 border-t border-danger">
                            <div className="flex justify-between font-medium text-danger text-xs">
                              <span>Budget Exceeded By:</span>
                              <span>OMR {budgetInfo.budgetExcess.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-danger mt-1">
                              Total cost exceeds available budget
                            </p>
                          </div>
                        ) : (
                          <div className="mt-2 pt-2 border-t border-info">
                            <div className="flex justify-between font-medium text-info text-xs">
                              <span>Budget Remaining After This Assignment:</span>
                              <span>
                                OMR {(
                                  budgetInfo.budgetRemaining -
                                  budgetInfo.newAssignmentCost
                                ).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-[10px] text-info mt-1">
                              {budgetInfo.plannedBudget > 0 
                                ? `${((budgetInfo.budgetRemaining - budgetInfo.newAssignmentCost) / budgetInfo.plannedBudget * 100).toFixed(1)}% of budget remaining`
                                : 'Budget information unavailable'
                              }
                            </p>
                          </div>
                        )}
                      </div>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="w-full bg-surface-3 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                budgetInfo.wouldExceedBudget
                                  ? "bg-danger"
                                  : "bg-info"
                              }`}
                              style={{
                                width: `${budgetInfo.plannedBudget > 0 
                                  ? Math.min(
                                      (budgetInfo.totalCostWithNew /
                                        budgetInfo.plannedBudget) *
                                        100,
                                      100
                                    )
                                  : 0}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-center mt-1">
                            <span
                              className={
                                budgetInfo.wouldExceedBudget
                                  ? "text-danger"
                                  : "text-info"
                              }
                            >
                              {budgetInfo.plannedBudget > 0
                                ? (
                                    (budgetInfo.totalCostWithNew /
                                      budgetInfo.plannedBudget) *
                                    100
                                  ).toFixed(1)
                                : '0.0'}
                              % of budget
                            </span>
                          </div>
                        </div>

                        {budgetInfo.wouldExceedBudget && (
                          <div className="mt-2 p-2 bg-danger-soft border border-danger rounded">
                            <div className="flex items-start">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 mr-1 mt-0.5 text-danger"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                              </svg>
                              <span className="text-danger font-medium">
                                Warning: This assignment will exceed the task
                                budget. Consider reducing planned hours or
                                adjusting the budget.
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Form Actions */}
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

export default ResourceAssignmentModal;
