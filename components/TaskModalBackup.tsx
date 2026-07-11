import React, { useState } from "react";

interface TaskModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialData?: any;
  wbsItems: any[];
  setup: any;
  tasks?: any[];
  onSave: (data: any) => Promise<any>;
  onClose: () => void;
  loading?: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  open,
  mode,
  initialData = {},
  wbsItems,
  setup,
  tasks = [],
  onSave,
  onClose,
  loading = false,
}) => {
  const [formData, setFormData] = useState(
    mode === "edit"
      ? {
          ...initialData,
          start_date: initialData.start_date?.split("T")[0] || "",
          end_date: initialData.end_date?.split("T")[0] || "",
        }
      : {
          name: "",
          description: "",
          wbs_id: "",
          start_date: "",
          end_date: "",
          duration: 1,
          estimated_hours: 8,
          priority: "medium",
          status: "todo",
          is_milestone: false,
          progress_percentage: 0,
          work_package: "",
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPredecessors, setSelectedPredecessors] = useState<number[]>([]);
  const [dependencyTypes, setDependencyTypes] = useState<Record<number, string>>({});
  const [lagTimes, setLagTimes] = useState<Record<number, number>>({});
  const [wbsSearchTerm, setWbsSearchTerm] = useState("");
  const [showWbsDropdown, setShowWbsDropdown] = useState(false);
  const [dependencySearchTerm, setDependencySearchTerm] = useState("");
  const [showDependencyDropdown, setShowDependencyDropdown] = useState(false);


  // Filter WBS items based on search term
  const filteredWbsItems = wbsItems.filter((wbs) =>
    `${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`
      .toLowerCase()
      .includes(wbsSearchTerm.toLowerCase())
  );

  // Helper to format Date object as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate duration between two dates
  const calculateDuration = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 1;
  };

  // Calculate dates based on dependency type
  const calculateDatesFromDependency = (
    predecessorTask: any,
    dependencyType: string,
    lagTime: number,
    successorDuration: number
  ): { start_date: string; end_date: string } => {
    const offDays = setup?.off_days || [];
    let startDate: Date;
    let endDate: Date;

    // Parse predecessor dates
    const [predStartYear, predStartMonth, predStartDay] = predecessorTask.start_date.split('T')[0].split('-').map(Number);
    const [predEndYear, predEndMonth, predEndDay] = predecessorTask.end_date.split('T')[0].split('-').map(Number);
    const predStart = new Date(predStartYear, predStartMonth - 1, predStartDay);
    const predEnd = new Date(predEndYear, predEndMonth - 1, predEndDay);

    switch (dependencyType) {
      case "FS": // Finish-to-Start
        startDate = new Date(predEnd);
        startDate.setDate(startDate.getDate() + lagTime);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + successorDuration - 1);
        break;
      case "SS": // Start-to-Start
        startDate = new Date(predStart);
        startDate.setDate(startDate.getDate() + lagTime);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + successorDuration - 1);
        break;
      case "FF": // Finish-to-Finish
        endDate = new Date(predEnd);
        endDate.setDate(endDate.getDate() + lagTime);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - successorDuration + 1);
        break;
      case "SF": // Start-to-Finish
        endDate = new Date(predStart);
        endDate.setDate(endDate.getDate() + lagTime);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - successorDuration + 1);
        break;
      default:
        startDate = new Date();
        endDate = new Date();
    }
    return {
      start_date: formatDateLocal(startDate),
      end_date: formatDateLocal(endDate)
    };
  };

  const handleInputChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };

    // Auto-populate dates when WBS is selected
    if (field === "wbs_id" && value) {
      // Optionally, set start/end dates based on WBS selection
    }

    // Auto-calculate end date when duration or start_date changes
    if (field === "duration" || field === "start_date") {
      if (newFormData.start_date && newFormData.duration) {
        const start = new Date(newFormData.start_date);
        const end = new Date(start);
        end.setDate(start.getDate() + Number(newFormData.duration) - 1);
        newFormData.end_date = formatDateLocal(end);
      }
    }
    // Auto-calculate duration when end_date changes
    else if (field === "end_date") {
      if (newFormData.start_date && newFormData.end_date) {
        newFormData.duration = calculateDuration(newFormData.start_date, newFormData.end_date);
      }
    }

    setFormData(newFormData);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Task name is required";
    if (!formData.wbs_id) newErrors.wbs_id = "WBS is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    if (formData.duration < 1) newErrors.duration = "Duration must be at least 1 day";
    if (formData.estimated_hours < 0) newErrors.estimated_hours = "Estimated hours must be positive";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSave(formData);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-8">
        <h2 className="text-xl font-bold mb-4 text-center">
          {mode === "add" ? "Add Task" : "Edit Task"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div>
            <label className="block font-medium mb-1">Task Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.name}
              onChange={e => handleInputChange("name", e.target.value)}
              disabled={loading}
            />
            {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
          </div>
          {/* Description */}
          <div>
            <label className="block font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.description}
              onChange={e => handleInputChange("description", e.target.value)}
              disabled={loading}
            />
          </div>
          {/* WBS Selection */}
          <div>
            <label className="block font-medium mb-1">WBS</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg mb-2"
              placeholder="Search WBS..."
              value={wbsSearchTerm}
              onChange={e => setWbsSearchTerm(e.target.value)}
              onFocus={() => setShowWbsDropdown(true)}
              onBlur={() => setTimeout(() => setShowWbsDropdown(false), 200)}
              disabled={loading}
            />
            {showWbsDropdown && (
              <div className="absolute bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto w-full">
                {filteredWbsItems.map(wbs => (
                  <div
                    key={wbs.wbs_id}
                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                    onMouseDown={() => {
                      handleInputChange("wbs_id", wbs.wbs_id);
                      setWbsSearchTerm(`${wbs.wbs_code} - ${wbs.name} (Level ${wbs.level})`);
                      setShowWbsDropdown(false);
                    }}
                  >
                    {wbs.wbs_code} - {wbs.name} (Level {wbs.level})
                  </div>
                ))}
              </div>
            )}
            {errors.wbs_id && <div className="text-red-600 text-sm mt-1">{errors.wbs_id}</div>}
          </div>
          {/* Dates & Duration */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block font-medium mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.start_date}
                onChange={e => handleInputChange("start_date", e.target.value)}
                disabled={loading}
              />
              {errors.start_date && <div className="text-red-600 text-sm mt-1">{errors.start_date}</div>}
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.end_date}
                onChange={e => handleInputChange("end_date", e.target.value)}
                disabled={loading}
              />
              {errors.end_date && <div className="text-red-600 text-sm mt-1">{errors.end_date}</div>}
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Duration (days)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.duration}
                onChange={e => handleInputChange("duration", Number(e.target.value))}
                disabled={loading}
              />
              {errors.duration && <div className="text-red-600 text-sm mt-1">{errors.duration}</div>}
            </div>
          </div>
          {/* Estimated Hours */}
          <div>
            <label className="block font-medium mb-1">Estimated Hours</label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.estimated_hours}
              onChange={e => handleInputChange("estimated_hours", Number(e.target.value))}
              disabled={loading}
            />
            {errors.estimated_hours && <div className="text-red-600 text-sm mt-1">{errors.estimated_hours}</div>}
          </div>
          {/* Priority & Status */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block font-medium mb-1">Priority</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.priority}
                onChange={e => handleInputChange("priority", e.target.value)}
                disabled={loading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.status}
                onChange={e => handleInputChange("status", e.target.value)}
                disabled={loading}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
          {/* Milestone & Work Package */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_milestone}
                onChange={e => handleInputChange("is_milestone", e.target.checked)}
                disabled={loading}
              />
              <label className="font-medium">Milestone</label>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Work Package</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.work_package}
                onChange={e => handleInputChange("work_package", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          {/* Predecessor Dependencies */}
          <div>
            <label className="block font-medium mb-1">Predecessor Dependencies</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg mb-2"
              placeholder="Search tasks..."
              value={dependencySearchTerm}
              onChange={e => setDependencySearchTerm(e.target.value)}
              onFocus={() => setShowDependencyDropdown(true)}
              onBlur={() => setTimeout(() => setShowDependencyDropdown(false), 200)}
              disabled={loading}
            />
            {showDependencyDropdown && (
              <div className="absolute bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto w-full">
                {tasks
                  .filter(
                    t =>
                      t.name.toLowerCase().includes(dependencySearchTerm.toLowerCase()) &&
                      t.task_id !== initialData?.task_id
                  )
                  .map(task => (
                    <div
                      key={task.task_id}
                      className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                      onMouseDown={() => {
                        if (!selectedPredecessors.includes(task.task_id)) {
                          setSelectedPredecessors([...selectedPredecessors, task.task_id]);
                        }
                        setDependencySearchTerm("");
                        setShowDependencyDropdown(false);
                      }}
                    >
                      {task.name}
                    </div>
                  ))}
              </div>
            )}
            {/* List selected predecessors with dependency type and lag time */}
            {selectedPredecessors.length > 0 && (
              <div className="mt-2 space-y-2">
                {selectedPredecessors.map(pid => {
                  const predTask = tasks.find(t => t.task_id === pid);
                  return (
                    <div key={pid} className="flex items-center gap-2">
                      <span className="font-medium">{predTask?.name}</span>
                      <select
                        className="px-2 py-1 border rounded"
                        value={dependencyTypes[pid] || "FS"}
                        onChange={e => setDependencyTypes({ ...dependencyTypes, [pid]: e.target.value })}
                        disabled={loading}
                      >
                        <option value="FS">Finish-to-Start</option>
                        <option value="SS">Start-to-Start</option>
                        <option value="FF">Finish-to-Finish</option>
                        <option value="SF">Start-to-Finish</option>
                      </select>
                      <input
                        type="number"
                        className="w-20 px-2 py-1 border rounded"
                        placeholder="Lag"
                        value={lagTimes[pid] || 0}
                        onChange={e => setLagTimes({ ...lagTimes, [pid]: Number(e.target.value) })}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="text-red-500 ml-2"
                        onClick={() => setSelectedPredecessors(selectedPredecessors.filter(id => id !== pid))}
                        disabled={loading}
                      >Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Form Actions */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium border border-blue-700"
              disabled={loading}
            >
              {loading ? "Saving..." : mode === "add" ? "Add Task" : "Save Changes"}
            </button>
          </div>
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 text-sm text-red-600 text-center">
              {Object.values(errors).map((err, idx) => (
                <div key={idx}>{err}</div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
