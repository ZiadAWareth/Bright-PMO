import { useState } from "react";
import { ProjectSetup, TaskAddUpdate } from "@/types/project";
import { calculateEndDate } from "@/lib/working-days";
import { formatDateLocal, calculateDuration, taskSchema } from "@/components/scheduler/taskHelpers";

interface UseTaskFormProps {
  setup: ProjectSetup | null;
  wbsItems: any[];
  initialData?: Partial<TaskAddUpdate>;
}

interface UseTaskFormReturn {
  formData: TaskAddUpdate;
  errors: Record<string, string>;
  handleInputChange: (field: string, value: any) => void;
  validateForm: () => boolean;
  setFormData: React.Dispatch<React.SetStateAction<TaskAddUpdate>>;
  resetForm: () => void;
  getFieldValue: (key: string) => any;
}

const getDefaultFormData = (): TaskAddUpdate => ({
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
});

export const useTaskForm = ({
  setup,
  wbsItems,
  initialData,
}: UseTaskFormProps): UseTaskFormReturn => {
  const [formData, setFormData] = useState<TaskAddUpdate>(() => {
    if (initialData) {
      // When editing, ensure dates are in correct format
      return {
        ...getDefaultFormData(),
        ...initialData,
        start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
        end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
      };
    }
    return getDefaultFormData();
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Auto-populate dates when WBS is selected
   */
  const handleWbsSelection = (
    wbsId: string,
    currentFormData: TaskAddUpdate
  ): TaskAddUpdate => {
    const selectedWBS = wbsItems.find(
      (wbs) => wbs.wbs_id === parseInt(wbsId)
    );
    
    if (!selectedWBS) return currentFormData;

    const newFormData = { ...currentFormData };

    // Set default start date to WBS start date (or current date if no WBS start date)
    if (selectedWBS.start_date && !newFormData.start_date) {
      newFormData.start_date = selectedWBS.start_date.split("T")[0];
    }

    // Set default end date to WBS end date (or WBS start date + 1 working day if no WBS end date)
    if (selectedWBS.end_date && !newFormData.end_date) {
      newFormData.end_date = selectedWBS.end_date.split("T")[0];
    } else if (selectedWBS.start_date && !newFormData.end_date) {
      // If no end date but has start date, default to start date + 1 working day
      const offDays = setup?.off_days || [];
      const [year, month, day] = selectedWBS.start_date
        .split("T")[0]
        .split("-")
        .map(Number);
      const startDate = new Date(year, month - 1, day);
      const endDate = calculateEndDate(startDate, 1, offDays);
      newFormData.end_date = formatDateLocal(endDate);
    }

    return newFormData;
  };

  /**
   * Auto-calculate end date when duration or start_date changes
   */
  const handleDateCalculationFromDuration = (
    currentFormData: TaskAddUpdate
  ): TaskAddUpdate => {
    if (
      currentFormData.start_date &&
      currentFormData.duration &&
      currentFormData.duration > 0
    ) {
      const offDays = setup?.off_days || [];
      const [year, month, day] = currentFormData.start_date
        .split("-")
        .map(Number);
      const startDate = new Date(year, month - 1, day);
      const endDate = calculateEndDate(
        startDate,
        currentFormData.duration,
        offDays
      );
      return {
        ...currentFormData,
        end_date: formatDateLocal(endDate),
      };
    }
    return currentFormData;
  };

  /**
   * Auto-calculate duration when end_date changes
   */
  const handleDurationCalculationFromDates = (
    currentFormData: TaskAddUpdate
  ): TaskAddUpdate => {
    if (currentFormData.start_date && currentFormData.end_date) {
      return {
        ...currentFormData,
        duration: calculateDuration(
          currentFormData.start_date,
          currentFormData.end_date,
          setup || null
        ),
      };
    }
    return currentFormData;
  };

  /**
   * Main input change handler with auto-calculations
   */
  const handleInputChange = (field: string, value: any) => {
    let newFormData = { ...formData, [field]: value } as TaskAddUpdate;

    // Auto-populate dates when WBS is selected
    if (field === "wbs_id" && value) {
      newFormData = handleWbsSelection(value, newFormData);
    }

    // Auto-calculate end date when duration or start_date changes
    if (field === "duration" || field === "start_date") {
      newFormData = handleDateCalculationFromDuration(newFormData);
    }
    // Auto-calculate duration when end_date changes OR when WBS is selected and dates are auto-populated
    else if (
      field === "end_date" ||
      (field === "wbs_id" && newFormData.start_date && newFormData.end_date)
    ) {
      newFormData = handleDurationCalculationFromDates(newFormData);
    }

    setFormData(newFormData);

    // Clear errors for this field
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  /**
   * Validate form data using Zod schema + custom date validations
   */
  const validateForm = (): boolean => {
    // Prepare data for Zod validation
    const parsed = {
      ...formData,
      duration: Number(formData.duration),
      estimated_hours: Number(formData.estimated_hours),
      progress_percentage: Number(formData.progress_percentage ?? 0),
      is_milestone: Boolean(formData.is_milestone),
    };

    const newErrors: Record<string, string> = {};

    // Zod validation
    const result = taskSchema.safeParse(parsed);
    if (!result.success) {
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
    }

    // Custom validation: end_date after start_date
    if (parsed.start_date && parsed.end_date) {
      if (new Date(parsed.start_date) > new Date(parsed.end_date)) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    // WBS date boundary validations
    if (parsed.wbs_id && parsed.start_date && parsed.end_date) {
      const selectedWBS = wbsItems.find(
        (wbs) => wbs.wbs_id === parseInt(parsed.wbs_id)
      );
      
      if (selectedWBS) {
        const taskStartDate = new Date(parsed.start_date);
        const taskEndDate = new Date(parsed.end_date);

        // REMOVED: WBS date constraints to enable bottom-up scheduling
        // Tasks can now extend beyond WBS dates and trigger rollup calculations
        // Only project-level constraints remain (handled by backend API)
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Reset form to default state
   */
  const resetForm = () => {
    setFormData(getDefaultFormData());
    setErrors({});
  };

  /**
   * Safely get field value for dynamic access
   */
  const getFieldValue = (key: string): any => {
    return (formData as any)[key] ?? "";
  };

  return {
    formData,
    errors,
    handleInputChange,
    validateForm,
    setFormData,
    resetForm,
    getFieldValue,
  };
};