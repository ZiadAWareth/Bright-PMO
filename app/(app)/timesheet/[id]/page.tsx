"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Save,
  Play,
  Pause,
  Square,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { FormSection, InfoGrid, StatusBadge } from "@/components/ui/form-shell";
import { timesheetStatusTone } from "@/lib/status-tone";

interface Timesheet {
  timesheet_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  status: string;
  total_hours: number;
  comments?: string;
  project: {
    name: string;
    description?: string;
  };
  time_entries: TimeEntry[];
  user: {
    user_id: number;
    username: string;
    email: string;
    account: {
      first_name: string;
      last_name: string;
      department?: string;
    };
    role: {
      name: string;
    };
  };
}

interface TimeEntry {
  time_entry_id: number;
  date: string;
  hours_spent: number;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  task: {
    task_id: number;
    name: string;
  };
}

interface Task {
  task_id: number;
  name: string;
  description?: string;
  status: string;
}

interface NewTimeEntry {
  task_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: string;
  description: string;
}

export default function TimesheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const timesheetId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>("");
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] =
    useState<TimeEntry | null>(null);
  const [timer, setTimer] = useState<{
    isRunning: boolean;
    startTime: Date | null;
    taskId: string;
    description: string;
    elapsedSeconds: number;
  }>({
    isRunning: false,
    startTime: null,
    taskId: "",
    description: "",
    elapsedSeconds: 0,
  });

  const [newEntry, setNewEntry] = useState<NewTimeEntry>({
    task_id: "",
    date: "",
    start_time: "",
    end_time: "",
    hours: "",
    description: "",
  });

  useEffect(() => {
    if (timesheetId) {
      fetchCurrentUser();
      fetchTimesheet();
    }
  }, [timesheetId]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API response:", response.data);
      // The API returns user data in a nested 'user' object
      setCurrentUser(response.data.user || response.data);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      router.push("/auth/login");
    }
  };

  useEffect(() => {
    if (timesheetId) {
      fetchTimesheet();
    }
  }, [timesheetId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer.isRunning && timer.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - timer.startTime!.getTime()) / 1000
        );
        setTimer((prev) => ({ ...prev, elapsedSeconds: elapsed }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.startTime]);

  const fetchTimesheet = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await axios.get(`/api/timesheets/${timesheetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTimesheet(response.data);
      await fetchProjectTasks(response.data.project_id);
    } catch (error) {
      console.error("Failed to fetch timesheet:", error);
      toast.error("Failed to load timesheet");
      router.push("/timesheet");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (projectId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Filter tasks to only show those belonging to the current project
      // The API already filters to only return tasks where the current user is assigned
      const projectTasks = response.data.filter(
        (task: any) => task.wbs && task.wbs.project_id === projectId
      );

      setTasks(projectTasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  // Helper functions
  const canViewOtherTimesheets = () => {
    return (
      currentUser?.role?.name &&
      ["ADMIN", "PMO", "PJM"].includes(currentUser.role.name)
    );
  };

  const isOwnTimesheet = () => {
    return (
      timesheet && currentUser && timesheet.user.user_id === currentUser.user_id
    );
  };

  const canEditTimesheet = () => {
    if (!timesheet) return false;
    // Only allow editing if it's DRAFT status and user owns the timesheet
    return timesheet.status === "DRAFT" && isOwnTimesheet();
  };

  // Handle timesheet approval
  const handleApproveTimesheet = async () => {
    if (!timesheet) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `/api/timesheets/${timesheet.timesheet_id}`,
        {
          status: "APPROVED",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Timesheet approved successfully");
      await fetchTimesheet(); // Refresh to get updated status
    } catch (error: any) {
      console.error("Failed to approve timesheet:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to approve timesheet";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle timesheet rejection
  const handleRejectTimesheet = async () => {
    if (!timesheet) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `/api/timesheets/${timesheet.timesheet_id}`,
        {
          status: "REJECTED",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Timesheet rejected successfully");
      await fetchTimesheet(); // Refresh to get updated status
    } catch (error: any) {
      console.error("Failed to reject timesheet:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to reject timesheet";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Calculate total hours from current time entries
  const calculateTotalHours = () => {
    if (!timesheet || !timesheet.time_entries) return 0;
    return timesheet.time_entries.reduce((total, entry) => {
      return total + (entry.hours_spent || 0);
    }, 0);
  };

  // Calculate unique days logged
  const getUniqueDaysLogged = () => {
    if (!timesheet || !timesheet.time_entries) return 0;
    const uniqueDates = new Set(
      timesheet.time_entries.map((entry) => entry.date.split("T")[0])
    );
    return uniqueDates.size;
  };

  // Calculate average hours per day
  const calculateAverageHoursPerDay = () => {
    const totalHours = calculateTotalHours();
    const daysLogged = getUniqueDaysLogged();
    return daysLogged > 0 ? totalHours / daysLogged : 0;
  };

  const getWeekDays = () => {
    if (!timesheet) return [];

    const startDate = new Date(timesheet.start_date);
    const endDate = new Date(timesheet.end_date);
    const days = [];

    const current = new Date(startDate);
    while (current <= endDate) {
      days.push({
        date: current.toISOString().split("T")[0],
        dayName: current.toLocaleDateString("en-US", { weekday: "long" }),
        shortDate: current.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getEntriesForDay = (date: string) => {
    if (!timesheet) return [];
    return timesheet.time_entries.filter(
      (entry) => entry.date.split("T")[0] === date
    );
  };

  const getTotalHoursForDay = (date: string) => {
    return getEntriesForDay(date).reduce(
      (total, entry) => total + entry.hours_spent,
      0
    );
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = (taskId: string, description: string = "") => {
    setTimer({
      isRunning: true,
      startTime: new Date(),
      taskId,
      description,
      elapsedSeconds: 0,
    });
    toast.success("Timer started");
  };

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
    toast.info("Timer paused");
  };

  const stopTimer = async () => {
    if (!timer.startTime || !timer.taskId) return;

    const endTime = new Date();
    const startTime = timer.startTime;
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const timeEntry = {
      task_id: parseInt(timer.taskId),
      date: startTime.toISOString().split("T")[0],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      hours: hours.toFixed(2),
      description: timer.description || "Tracked time entry",
    };

    await handleCreateTimeEntry(timeEntry);

    setTimer({
      isRunning: false,
      startTime: null,
      taskId: "",
      description: "",
      elapsedSeconds: 0,
    });

    toast.success(`Timer stopped. Logged ${hours.toFixed(2)} hours`);
  };

  const handleCreateTimeEntry = async (entryData: any) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload =
        !isOwnTimesheet() && canViewOtherTimesheets() && timesheet
          ? { ...entryData, timesheet_id: timesheet.timesheet_id }
          : entryData;

      console.log("Creating time entry with data:", payload);

      await axios.post(`/api/time-entries`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Time entry created successfully");
      await fetchTimesheet(); // Refresh the timesheet
      setIsNewEntryModalOpen(false);
      resetNewEntryForm();
    } catch (error: any) {
      console.error("Failed to create time entry:", error);
      console.error("Error response:", error.response?.data);

      // Show specific error message from backend if available
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to create time entry";

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTimeEntry = async (entryId: number, entryData: any) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      console.log("Sending update request:", {
        entryId,
        entryData,
        url: `/api/time-entries/${entryId}`,
      });

      const response = await axios.put(
        `/api/time-entries/${entryId}`,
        entryData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Update response:", response.data);

      toast.success("Time entry updated successfully");
      await fetchTimesheet(); // Refresh the timesheet
      setEditingEntry(null);
    } catch (error: any) {
      console.error("Failed to update time entry:", error);
      console.error("Error response:", error.response?.data);

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update time entry";

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      // Find the entry to get task_id
      const entryToDelete = timesheet?.time_entries.find(
        (entry) => entry.time_entry_id === entryId
      );

      if (!entryToDelete) {
        toast.error("Time entry not found");
        return;
      }

      console.log("Deleting time entry:", {
        entryId,
        project_id: timesheet?.project_id,
        task_id: entryToDelete.task.task_id,
      });

      await axios.delete(`/api/time-entries/${entryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: {
          project_id: timesheet?.project_id,
          task_id: entryToDelete.task.task_id,
        },
      });

      toast.success("Time entry deleted successfully");
      await fetchTimesheet(); // Refresh the timesheet
      setDeleteConfirmEntry(null); // Close modal
    } catch (error: any) {
      console.error("Failed to delete time entry:", error);
      console.error("Error response:", error.response?.data);

      // Show specific error message from backend if available
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to delete time entry";

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!timesheet) return;

    const totalHours = calculateTotalHours();
    if (totalHours === 0) {
      toast.error("Cannot submit timesheet with no hours");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `/api/timesheets/${timesheetId}`,
        {
          status: "SUBMITTED",
          total_hours: totalHours, // Update total hours when submitting
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Timesheet submitted for approval");
      await fetchTimesheet(); // Refresh the timesheet
    } catch (error: any) {
      console.error("Failed to submit timesheet:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to submit timesheet";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveComments = async () => {
    if (!timesheet) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `/api/timesheets/${timesheetId}`,
        {
          comments: timesheet.comments,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Comments saved successfully");
      await fetchTimesheet(); // Refresh the timesheet
    } catch (error) {
      console.error("Failed to save comments:", error);
      toast.error("Failed to save comments");
    } finally {
      setSaving(false);
    }
  };

  const resetNewEntryForm = () => {
    setNewEntry({
      task_id: "",
      date: "",
      start_time: "",
      end_time: "",
      hours: "",
      description: "",
    });
  };

  const calculateHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return "";

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    if (end <= start) return "";

    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return hours.toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-warning-soft text-warning  ";
      case "SUBMITTED":
        return "bg-info-soft text-info  ";
      case "APPROVED":
        return "bg-success-soft text-success  ";
      case "REJECTED":
        return "bg-danger-soft text-danger  ";
      default:
        return "bg-surface-2 text-ink-2  ";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Timesheet Details">
        <div className="flex items-center justify-center h-64">
          <Spinner size={48} className="text-bright-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!timesheet) {
    return (
      <DashboardLayout title="Timesheet Not Found">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-ink">
            Timesheet not found
          </h2>
          <Button onClick={() => router.push("/timesheet")} className="mt-4">
            Back to Timesheets
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const weekDays = getWeekDays();

  const overviewRows: [string, React.ReactNode][] = [
    ["Project", timesheet.project.name],
    [
      "Period",
      `${new Date(timesheet.start_date).toLocaleDateString()} – ${new Date(
        timesheet.end_date,
      ).toLocaleDateString()}`,
    ],
    [
      "Owner",
      `${timesheet.user.account.first_name} ${timesheet.user.account.last_name}`,
    ],
    ["Role", timesheet.user.role?.name || "—"],
    ["Department", timesheet.user.account.department || "—"],
    [
      "Status",
      <StatusBadge
        key="status"
        label={timesheet.status}
        tone={timesheetStatusTone(timesheet.status)}
      />,
    ],
    ["Total Hours", `${calculateTotalHours().toFixed(1)}h`],
    ["Entries", timesheet.time_entries.length],
  ];

  return (
    <DashboardLayout
      title={timesheet.project.name}
      subtitle={`Week of ${new Date(
        timesheet.start_date,
      ).toLocaleDateString()} – ${new Date(
        timesheet.end_date,
      ).toLocaleDateString()}`}
      backHref="/timesheet"
      backLabel="Back to Timesheets"
      actions={
        <>
          <StatusBadge
            label={timesheet.status}
            tone={timesheetStatusTone(timesheet.status)}
          />
          <Button
            variant="outline"
            onClick={() => router.push(`/timesheet/${timesheetId}/edit`)}
          >
            <Edit size={16} className="mr-2" />
            Edit
          </Button>
          {timesheet.status === "DRAFT" && isOwnTimesheet() && (
            <Button
              onClick={handleSubmitTimesheet}
              disabled={saving || calculateTotalHours() === 0}
              className="bg-success hover:opacity-90 text-white"
            >
              <CheckCircle size={16} className="mr-2" />
              Submit for Approval
            </Button>
          )}
        </>
      }
      meta={
        !isOwnTimesheet() ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-ink-2">
              {timesheet.user.account.first_name}{" "}
              {timesheet.user.account.last_name}
            </span>
            {timesheet.user.account.department && (
              <span>· {timesheet.user.account.department}</span>
            )}
            {timesheet.user.role && <span>· {timesheet.user.role.name}</span>}
            {canViewOtherTimesheets() && currentUser?.role?.name && (
              <span className="text-faint">
                · viewing as {currentUser.role.name}
              </span>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Timer Widget */}
        {timer.isRunning && (
          <Card className="border-bright bg-bright-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-bright" />
                    <span className="font-semibold text-bright">
                      Timer Running
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-bright">
                    {formatTime(timer.elapsedSeconds)}
                  </div>
                  {timer.taskId &&
                    tasks.find(
                      (t) => t.task_id.toString() === timer.taskId
                    ) && (
                      <div className="text-sm text-bright-deep">
                        Task:{" "}
                        {
                          tasks.find(
                            (t) => t.task_id.toString() === timer.taskId
                          )?.name
                        }
                      </div>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pauseTimer}
                    className="border-bright text-bright-deep hover:bg-bright-soft"
                  >
                    <Pause size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopTimer}
                    className="border-danger text-danger hover:bg-danger-soft"
                  >
                    <Square size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Notice */}
        {timesheet.status !== "DRAFT" && (
          <Card
            className={`border-2 ${
              timesheet.status === "SUBMITTED"
                ? "border-info bg-info-soft "
                : timesheet.status === "APPROVED"
                ? "border-success bg-success-soft "
                : "border-danger bg-danger-soft "
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle
                  className={`h-5 w-5 ${
                    timesheet.status === "SUBMITTED"
                      ? "text-info"
                      : timesheet.status === "APPROVED"
                      ? "text-success"
                      : "text-danger"
                  }`}
                />
                <div>
                  <p
                    className={`font-semibold ${
                      timesheet.status === "SUBMITTED"
                        ? "text-info "
                        : timesheet.status === "APPROVED"
                        ? "text-success "
                        : "text-danger "
                    }`}
                  >
                    Timesheet{" "}
                    {timesheet.status === "SUBMITTED"
                      ? "Submitted for Approval"
                      : timesheet.status}
                  </p>
                  <p
                    className={`text-sm ${
                      timesheet.status === "SUBMITTED"
                        ? "text-info"
                        : timesheet.status === "APPROVED"
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {timesheet.status === "SUBMITTED"
                      ? "This timesheet is pending approval and cannot be edited."
                      : timesheet.status === "APPROVED"
                      ? "This timesheet has been approved and is now read-only."
                      : "This timesheet has been rejected. Contact your supervisor for more information."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview — the timesheet's own attributes, as a definition list.
            Previously these were scattered across the header, the status banner
            and the approval card, so no single place answered "whose week is
            this and what state is it in?". */}
        <FormSection title="Overview">
          <InfoGrid rows={overviewRows} />
        </FormSection>

        {/* Summary Stats */}
        <FormSection title="This Week">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
            {(
              [
                [Clock, "text-bright", "Total Hours", `${calculateTotalHours().toFixed(1)}h`],
                [Calendar, "text-info", "Entries", timesheet.time_entries.length],
                [CheckCircle, "text-success", "Days Logged", getUniqueDaysLogged()],
                [Play, "text-accent-violet", "Avg/Day", `${calculateAverageHoursPerDay().toFixed(1)}h`],
              ] as [typeof Clock, string, string, React.ReactNode][]
            ).map(([Icon, tone, label, value]) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[12px] text-muted">{label}</p>
                  <p className="text-[20px] font-semibold tabular-nums text-ink">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        {/* Add New Entry Button - owner or Admin/PJM on behalf */}
        {(isOwnTimesheet() || canViewOtherTimesheets()) && (
          <div className="flex justify-end">
            <Dialog
              open={isNewEntryModalOpen}
              onOpenChange={setIsNewEntryModalOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-bright hover:bg-bright-deep text-white"
                  disabled={timesheet.status !== "DRAFT"}
                >
                  <Plus size={16} className="mr-2" />
                  Add Time Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Time Entry</DialogTitle>
                  <DialogDescription>
                    Record time spent on a specific task for this project.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="task">Task *</Label>
                      <Select
                        value={newEntry.task_id}
                        onValueChange={(value) =>
                          setNewEntry({ ...newEntry, task_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem
                              key={task.task_id}
                              value={task.task_id.toString()}
                            >
                              {task.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Temporarily commented out start timer button */}
                      {/* {newEntry.task_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => startTimer(newEntry.task_id)}
                        disabled={timer.isRunning}
                      >
                        <Play size={14} className="mr-1" />
                        Start Timer
                      </Button>
                    )} */}
                    </div>

                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEntry.date}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, date: e.target.value })
                        }
                        min={timesheet.start_date.split("T")[0]}
                        max={timesheet.end_date.split("T")[0]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time *</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={newEntry.start_time}
                        onChange={(e) => {
                          const updatedEntry = {
                            ...newEntry,
                            start_time: e.target.value,
                          };
                          if (updatedEntry.end_time) {
                            updatedEntry.hours = calculateHours(
                              updatedEntry.start_time,
                              updatedEntry.end_time
                            );
                          }
                          setNewEntry(updatedEntry);
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_time">End Time *</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={newEntry.end_time}
                        onChange={(e) => {
                          const updatedEntry = {
                            ...newEntry,
                            end_time: e.target.value,
                          };
                          if (updatedEntry.start_time) {
                            updatedEntry.hours = calculateHours(
                              updatedEntry.start_time,
                              updatedEntry.end_time
                            );
                          }
                          setNewEntry(updatedEntry);
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="hours">Hours *</Label>
                      <Input
                        id="hours"
                        type="number"
                        step="0.25"
                        value={newEntry.hours}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, hours: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newEntry.description}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe the work performed..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsNewEntryModalOpen(false);
                        resetNewEntryForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleCreateTimeEntry(newEntry)}
                      disabled={
                        saving ||
                        !newEntry.task_id ||
                        !newEntry.date ||
                        !newEntry.hours
                      }
                      className="bg-bright hover:bg-bright-deep text-white"
                    >
                      {saving ? "Creating..." : "Create Entry"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Edit Entry Modal */}
        {editingEntry && (
          <Dialog
            open={!!editingEntry}
            onOpenChange={(open) => !open && setEditingEntry(null)}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Time Entry</DialogTitle>
                <DialogDescription>
                  Update the details of this time entry.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-task">Task *</Label>
                    <Select
                      value={editingEntry.task.task_id.toString()}
                      onValueChange={(value) =>
                        setEditingEntry({
                          ...editingEntry,
                          task: {
                            ...editingEntry.task,
                            task_id: parseInt(value),
                            name:
                              tasks.find((t) => t.task_id.toString() === value)
                                ?.name || editingEntry.task.name,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((task) => (
                          <SelectItem
                            key={task.task_id}
                            value={task.task_id.toString()}
                          >
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-date">Date *</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editingEntry.date.split("T")[0]}
                      onChange={(e) =>
                        setEditingEntry({
                          ...editingEntry,
                          date: e.target.value,
                        })
                      }
                      min={timesheet.start_date.split("T")[0]}
                      max={timesheet.end_date.split("T")[0]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-start-time">Start Time *</Label>
                    <Input
                      id="edit-start-time"
                      type="time"
                      value={new Date(editingEntry.start_time)
                        .toTimeString()
                        .slice(0, 5)}
                      onChange={(e) => {
                        const date = editingEntry.date.split("T")[0];
                        const startDateTime = new Date(
                          `${date}T${e.target.value}:00`
                        );
                        const endDateTime = new Date(editingEntry.end_time);
                        const hours =
                          (endDateTime.getTime() - startDateTime.getTime()) /
                          (1000 * 60 * 60);

                        setEditingEntry({
                          ...editingEntry,
                          start_time: startDateTime.toISOString(),
                          hours_spent:
                            hours > 0
                              ? parseFloat(hours.toFixed(2))
                              : editingEntry.hours_spent,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-end-time">End Time *</Label>
                    <Input
                      id="edit-end-time"
                      type="time"
                      value={new Date(editingEntry.end_time)
                        .toTimeString()
                        .slice(0, 5)}
                      onChange={(e) => {
                        const date = editingEntry.date.split("T")[0];
                        const endDateTime = new Date(
                          `${date}T${e.target.value}:00`
                        );
                        const startDateTime = new Date(editingEntry.start_time);
                        const hours =
                          (endDateTime.getTime() - startDateTime.getTime()) /
                          (1000 * 60 * 60);

                        setEditingEntry({
                          ...editingEntry,
                          end_time: endDateTime.toISOString(),
                          hours_spent:
                            hours > 0
                              ? parseFloat(hours.toFixed(2))
                              : editingEntry.hours_spent,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-hours">Hours *</Label>
                    <Input
                      id="edit-hours"
                      type="number"
                      step="0.25"
                      value={editingEntry.hours_spent}
                      onChange={(e) =>
                        setEditingEntry({
                          ...editingEntry,
                          hours_spent: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingEntry.description || ""}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the work performed..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditingEntry(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      // Get the date part
                      const entryDate = editingEntry.date.split("T")[0];

                      // Extract time parts - handle both ISO string and time-only formats
                      let startTimeStr = editingEntry.start_time;
                      let endTimeStr = editingEntry.end_time;

                      // If it's an ISO string, extract just the time part
                      if (startTimeStr.includes("T")) {
                        startTimeStr = startTimeStr
                          .split("T")[1]
                          .substring(0, 8); // HH:MM:SS
                      }
                      if (endTimeStr.includes("T")) {
                        endTimeStr = endTimeStr.split("T")[1].substring(0, 8); // HH:MM:SS
                      }

                      // Create full ISO datetime strings
                      const startDateTime = new Date(
                        `${entryDate}T${startTimeStr}`
                      );
                      const endDateTime = new Date(
                        `${entryDate}T${endTimeStr}`
                      );

                      const updateData = {
                        project_id: timesheet?.project_id,
                        task_id: editingEntry.task.task_id,
                        date: entryDate, // Just the date part, not full ISO string
                        start_time: startDateTime.toISOString(),
                        end_time: endDateTime.toISOString(),
                        hours: editingEntry.hours_spent,
                        description: editingEntry.description || "",
                      };

                      console.log("Debug info:", {
                        entryDate,
                        startTimeStr,
                        endTimeStr,
                        startDateTime: startDateTime.toISOString(),
                        endDateTime: endDateTime.toISOString(),
                        startTime: startDateTime.getTime(),
                        endTime: endDateTime.getTime(),
                        isStartBeforeEnd: startDateTime < endDateTime,
                      });

                      console.log("Update data being sent:", updateData);

                      handleUpdateTimeEntry(
                        editingEntry.time_entry_id,
                        updateData
                      );
                    }}
                    disabled={
                      saving ||
                      !editingEntry.task.task_id ||
                      !editingEntry.date ||
                      !editingEntry.hours_spent
                    }
                    className="bg-bright hover:bg-bright-deep text-white"
                  >
                    {saving ? "Updating..." : "Update Entry"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmEntry && (
          <Dialog
            open={!!deleteConfirmEntry}
            onOpenChange={(open) => !open && setDeleteConfirmEntry(null)}
          >
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Delete Time Entry</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this time entry? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-surface-2 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium text-ink">
                      {deleteConfirmEntry.task.name}
                    </div>
                    <div className="text-muted mt-1">
                      {deleteConfirmEntry.hours_spent}h on{" "}
                      {new Date(deleteConfirmEntry.date).toLocaleDateString()}
                    </div>
                    <div className="text-muted">
                      {new Date(
                        deleteConfirmEntry.start_time
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(deleteConfirmEntry.end_time).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                    {deleteConfirmEntry.description && (
                      <div className="text-faint mt-2 text-xs">
                        {deleteConfirmEntry.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmEntry(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleDeleteTimeEntry(deleteConfirmEntry.time_entry_id)
                    }
                    disabled={saving}
                  >
                    {saving ? "Deleting..." : "Delete Entry"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Weekly View */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayEntries = getEntriesForDay(day.date);
            const totalHours = getTotalHoursForDay(day.date);

            return (
              <Card key={day.date} className="min-h-[300px]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {day.dayName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {day.shortDate}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {totalHours}h
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.time_entry_id}
                        className="p-2 bg-surface-2 rounded-lg text-xs border"
                      >
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <span className="font-medium text-ink text-xs break-words flex-1 min-w-0">
                            {entry.task.name}
                          </span>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {(isOwnTimesheet() || canViewOtherTimesheets()) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setEditingEntry(entry)}
                                  disabled={timesheet.status !== "DRAFT"}
                                >
                                  <Edit size={12} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-danger"
                                  onClick={() => setDeleteConfirmEntry(entry)}
                                  disabled={timesheet.status !== "DRAFT"}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-muted">
                          {entry.hours_spent}h (
                          {new Date(entry.start_time).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}{" "}
                          -{" "}
                          {new Date(entry.end_time).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                          )
                        </div>
                        {entry.description && (
                          <div className="text-faint mt-1 text-xs">
                            {entry.description}
                          </div>
                        )}
                      </div>
                    ))}

                    {dayEntries.length === 0 && (
                      <div className="text-center text-muted py-4 text-xs">
                        No entries
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Approval Section for Privileged Users */}
        {!isOwnTimesheet() &&
          canViewOtherTimesheets() &&
          timesheet.status === "SUBMITTED" && (
            <Card className="border-info bg-info-soft">
              <CardHeader>
                <CardTitle className="text-info">
                  Timesheet Approval
                </CardTitle>
                <CardDescription className="text-info">
                  Review and approve/reject this timesheet submission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleApproveTimesheet}
                    className="bg-success hover:opacity-90 text-white"
                    disabled={saving}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    {saving ? "Approving..." : "Approve Timesheet"}
                  </Button>
                  <Button
                    onClick={handleRejectTimesheet}
                    variant="destructive"
                    disabled={saving}
                  >
                    {saving ? "Rejecting..." : "Reject Timesheet"}
                  </Button>
                </div>
                <p className="text-sm text-info mt-3">
                  Total Hours: {calculateTotalHours().toFixed(1)}h • Submitted
                  by: {timesheet.user.account.first_name}{" "}
                  {timesheet.user.account.last_name}
                </p>
              </CardContent>
            </Card>
          )}

        {/* Comments Section */}
        <FormSection
          title="Comments"
          description="Any additional notes about this timesheet."
        >
          <div>
            <Textarea
              value={timesheet.comments || ""}
              onChange={(e) =>
                setTimesheet({ ...timesheet, comments: e.target.value })
              }
              placeholder="Add comments about this timesheet..."
              rows={3}
              disabled={timesheet.status !== "DRAFT" || !isOwnTimesheet()}
            />
            {timesheet.status === "DRAFT" && isOwnTimesheet() && (
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleSaveComments}
                  disabled={saving}
                  variant="outline"
                >
                  <Save size={16} className="mr-2" />
                  Save Comments
                </Button>
              </div>
            )}
          </div>
        </FormSection>
      </div>
    </DashboardLayout>
  );
}
