import { ProjectSetup } from "@/types/project";
import { FieldConfig } from "@/components/scheduler/taskHelpers";

type TaskFieldConfig = FieldConfig<any>;

export const getTaskFieldConfig = (setup: ProjectSetup | null): TaskFieldConfig[] => [
  {
    key: "name",
    label: "Task Name",
    type: "text",
    required: true,
    placeholder: "Enter task name"
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Enter task description",
    rows: 3
  },
  {
    key: "wbs_id",
    label: "WBS Item",
    type: "wbs-search",
    required: true,
    placeholder: "Search WBS items...",
    helper: "Select a WBS item for this task."
  },
  {
    key: "start_date",
    label: "Start Date",
    type: "date",
    required: true
  },
  {
    key: "end_date",
    label: "End Date",
    type: "date",
    required: true
  },
  {
    key: "duration",
    label: "Duration (Working Days)",
    type: "number",
    min: 1,
    required: true,
    helper: `Enter duration to auto-calculate end date (excludes ${setup?.off_days?.join(", ") || "weekends"})`
  },
  {
    key: "estimated_hours",
    label: "Estimated Hours",
    type: "number",
    min: 0,
    step: 0.5,
    placeholder: "e.g. 8"
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" }
    ]
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "todo", label: "To Do" },
      { value: "in_progress", label: "In Progress" },
      { value: "completed", label: "Completed" },
      { value: "on_hold", label: "On Hold" }
    ]
  },
  {
    key: "work_package",
    label: "Work Package",
    type: "text",
    placeholder: "Enter work package (optional)"
  },
  {
    key: "is_milestone",
    label: "This is a milestone",
    type: "checkbox"
  },
];