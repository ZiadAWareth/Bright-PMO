import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamUserSelect } from "./TeamUserSelect";
import { toast } from "sonner";
import axios from "axios";

interface UserOption {
    user_id: number;
    account: { first_name: string; last_name: string };
    email: string;
    role?: { name?: string };
}

interface TaskOption {
    task_id: number;
    name: string;
}

interface AssignMitigationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    riskId: number;
    users: UserOption[];
    tasks: TaskOption[];
    mitigation?: {
        mitigation_id: number;
        description: string;
        action_plan: string;
        start_date: string;
        due_date: string;
        status: string;
        assigned_to: number;
        task_id?: number;
    };
}

const statusOptions = [
    { value: "planned", label: "Planned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "cancelled", label: "Cancelled" },
    { value: "overdue", label: "Overdue" },
];

export default function AssignMitigationModal({
    isOpen,
    onClose,
    onSuccess,
    riskId,
    users,
    tasks,
    mitigation,
}: AssignMitigationModalProps) {
    const [assignedTo, setAssignedTo] = useState("");
    const [taskId, setTaskId] = useState("");
    const [description, setDescription] = useState("");
    const [actionPlan, setActionPlan] = useState("");
    const [startDate, setStartDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [status, setStatus] = useState("planned");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (mitigation) {
            setAssignedTo(mitigation.assigned_to?.toString() || "");
            setTaskId(mitigation.task_id?.toString() || "");
            setDescription(mitigation.description || "");
            setActionPlan(mitigation.action_plan?.split("\nLinked Task:")[0] || "");
            setStartDate(mitigation.start_date ? mitigation.start_date.split("T")[0] : "");
            setDueDate(mitigation.due_date ? mitigation.due_date.split("T")[0] : "");
            setStatus(mitigation.status || "planned");
        } else {
            setAssignedTo("");
            setTaskId("");
            setDescription("");
            setActionPlan("");
            setStartDate("");
            setDueDate("");
            setStatus("planned");
        }
    }, [mitigation, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (
            !assignedTo ||
            !taskId ||
            !description ||
            !actionPlan ||
            !startDate ||
            !dueDate
        ) {
            setError("All fields are required.");
            return;
        }
        setLoading(true);
        try {
            if (mitigation) {
                // Edit mode
                await axios.patch(
                    `/api/riskMitigations/${mitigation.mitigation_id}`,
                    {
                        risk_id: riskId,
                        description,
                        action_plan: `${actionPlan}\nLinked Task: ${
                            tasks.find((t) => t.task_id.toString() === taskId)
                                ?.name || ""
                        }`,
                        start_date: startDate,
                        due_date: dueDate,
                        status,
                        assigned_to: parseInt(assignedTo),
                        task_id: parseInt(taskId),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                    }
                );
                toast.success("Mitigation updated successfully");
            } else {
                // Create mode
                await axios.post(
                    "/api/riskMitigations",
                    {
                        risk_id: riskId,
                        description,
                        action_plan: `${actionPlan}\nLinked Task: ${
                            tasks.find((t) => t.task_id.toString() === taskId)
                                ?.name || ""
                        }`,
                        start_date: startDate,
                        due_date: dueDate,
                        status,
                        assigned_to: parseInt(assignedTo),
                        task_id: parseInt(taskId),
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                    }
                );
                toast.success("Mitigation assigned successfully");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(
                err.response?.data?.error || "Failed to save mitigation"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAssignedTo("");
        setTaskId("");
        setDescription("");
        setActionPlan("");
        setStartDate("");
        setDueDate("");
        setStatus("planned");
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mitigation ? "Edit Mitigation" : "Assign Risk Mitigation"}</DialogTitle>
                </DialogHeader>
                {error && (
                    <div className="bg-red-100 text-red-700 rounded p-2 mb-3">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Assigned To
                        </label>
                        <TeamUserSelect
                            users={users}
                            value={assignedTo}
                            onChange={setAssignedTo}
                            placeholder="Select assigned user"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Task
                        </label>
                        <select
                            value={taskId}
                            onChange={(e) => setTaskId(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">Select a task</option>
                            {tasks.map((task) => (
                                <option key={task.task_id} value={task.task_id}>
                                    {task.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Action Plan
                        </label>
                        <textarea
                            value={actionPlan}
                            onChange={(e) => setActionPlan(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="ml-2 bg-orange-600 text-white"
                            disabled={loading}
                        >
                            {loading
                                ? mitigation
                                    ? "Saving..."
                                    : "Assigning..."
                                : mitigation
                                    ? "Save Changes"
                                    : "Assign Mitigation"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
