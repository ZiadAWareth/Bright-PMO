"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Save, AlertCircle, Search } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";

interface User {
    user_id: number;
    account: {
        first_name: string;
        last_name: string;
    };
}

interface ProjectDetails {
    start_date: string;
    planned_end_date: string;
    name: string;
}

interface ProjectOption {
    project_id: number;
    name: string;
}

interface AddRiskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectId?: string;
    projects?: ProjectOption[];
}

interface RiskForm {
    name: string;
    description: string;
    category: string;
    impact: string;
    probability: string;
    status: string;
    owner_id: number;
    approvalStatus: string;
    riskScore: number;
    identified_date: string;
    project_id: number;
}

const defaultForm: RiskForm = {
    name: "",
    description: "",
    category: "technical",
    impact: "medium",
    probability: "medium",
    status: "identified",
    owner_id: 0,
    approvalStatus: "Pending",
    riskScore: 5,
    identified_date: new Date().toISOString().slice(0, 10),
    project_id: 0,
};

const categoryOptions = [
    { value: "technical", label: "Technical" },
    { value: "schedule", label: "Schedule" },
    { value: "cost", label: "Cost" },
    { value: "resource", label: "Resource" },
    { value: "quality", label: "Quality" },
    { value: "communication", label: "Communication" },
    { value: "external", label: "External" },
    { value: "regulatory", label: "Regulatory" },
    { value: "environmental", label: "Environmental" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
];

const impactOptions = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

const probabilityOptions = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

const statusOptions = [
    { value: "identified", label: "Identified" },
    { value: "assessed", label: "Assessed" },
    { value: "mitigated", label: "Mitigated" },
    { value: "closed", label: "Closed" },
    { value: "escalated", label: "Escalated" },
    { value: "monitoring", label: "Monitoring" },
];

const approvalStatusOptions = [
    { value: "Pending", label: "Pending" },
    { value: "Approved for Mitigation", label: "Approved for Mitigation" },
];

export default function AddRiskModal({
    isOpen,
    onClose,
    onSuccess,
    projectId,
    projects,
}: AddRiskModalProps) {
    const isSingleProjectMode = !!projectId;
    const isMultiProjectMode = !!projects;

    const [form, setForm] = useState<RiskForm>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [dateError, setDateError] = useState<string>("");
    const [ownerSearchQuery, setOwnerSearchQuery] = useState<string>("");
    const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            if (isSingleProjectMode) {
                fetchProject();
            }
            setForm(defaultForm);
            setError(null);
            setDateError("");
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("/api/users", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const fetchProject = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`/api/projects/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setProject(response.data);
        } catch (error) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project details");
        }
    };

    const filteredUsers = useMemo(() => {
        if (!ownerSearchQuery.trim()) return users;
        const query = ownerSearchQuery.toLowerCase();
        return users.filter(user =>
            `${user.account.first_name} ${user.account.last_name}`.toLowerCase().includes(query)
        );
    }, [users, ownerSearchQuery]);

    const validateDate = (dateValue: string) => {
        if (!project) return true;

        const selectedDate = new Date(dateValue);
        const projectStartDate = new Date(project.start_date);
        const projectEndDate = project.planned_end_date ? new Date(project.planned_end_date) : new Date();

        if (selectedDate < projectStartDate || selectedDate > projectEndDate) {
            setDateError(
                `Risk date must be between ${new Date(project.start_date).toLocaleDateString()} and ${project.planned_end_date ? new Date(project.planned_end_date).toLocaleDateString() : 'N/A'}`
            );
            return false;
        }
        setDateError("");
        return true;
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        const { name, value } = e.target;

        if (isSingleProjectMode && name === "identified_date") {
            validateDate(value);
        }

        setForm((prev) => ({
            ...prev,
            [name]:
                name === "owner_id" || name === "riskScore" || name === "project_id"
                    ? parseInt(value) || 0
                    : value,
        }));
    };

    const calculateRiskScore = (
        impact: string,
        probability: string
    ): number => {
        const impactValue = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
        const probabilityValue =
            probability === "high" ? 3 : probability === "medium" ? 2 : 1;
        return impactValue * probabilityValue;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.name.trim()) {
            setError("Risk name is required");
            return;
        }
        if (!form.owner_id) {
            setError("Risk owner is required");
            return;
        }

        if (isSingleProjectMode) {
            if (!validateDate(form.identified_date)) {
                setError(dateError);
                return;
            }
        }

        if (isMultiProjectMode) {
            if (!form.project_id || form.project_id === 0) {
                setError("Project is required");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem("token");
            const calculatedScore = calculateRiskScore(
                form.impact,
                form.probability
            );
            let riskLevel: string = "low";
            if (calculatedScore >= 7) riskLevel = "high";
            else if (calculatedScore >= 4) riskLevel = "medium";

            const riskData = {
                ...form,
                riskLevel,
                currentStatus: "Open",
                ...(isSingleProjectMode && { project_id: parseInt(projectId!) }),
            };

            await axios.post(
                `/api/risks`,
                { ...riskData },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            toast.success("Risk created successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error creating risk:", error);
            const errorMessage = error.response?.data?.error || "Failed to create risk";
            setError(errorMessage);
            if (isSingleProjectMode) {
                toast.error(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setForm(defaultForm);
        setError(null);
        onClose();
    };

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-2xl">
                    {/* The dialog still needs an accessible name while it
                        loads, even though only a spinner is on screen. */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Add New Risk</DialogTitle>
                    </DialogHeader>
                    <div className="flex h-32 items-center justify-center">
                        <Spinner size={32} className="text-bright" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-bright-soft rounded-full flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-bright" />
                        </div>
                        Add New Risk
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="bg-danger-soft border border-danger rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-danger" />
                            <span className="text-danger">
                                {error}
                            </span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Risk Name{" "}
                                <span className="text-danger">*</span>
                            </label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-bright dark:text-white"
                                placeholder="Enter risk name"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-bright dark:text-white"
                                placeholder="Describe the risk in detail"
                            />
                        </div>

                        {isMultiProjectMode && (
                            <div>
                                <label className="block text-sm font-medium text-ink-3 mb-1">
                                    Project <span className="text-danger">*</span>
                                </label>
                                <Dropdown
                                  value={String(form.project_id ?? '')}
                                  onChange={(__v: string) => handleChange({ target: { name: "project_id", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                                  options={[
                                  { value: String(0), label: "Select Project" },
                                  ...projects!.map((proj) => ({ value: String(proj.project_id), label: proj.name })),
                                ]}
                                  name="project_id"
                                  required={true}
                                  modal
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Category <span className="text-danger">*</span>
                            </label>
                            <Dropdown
                              value={String(form.category ?? '')}
                              onChange={(__v: string) => handleChange({ target: { name: "category", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                              options={[
                              ...categoryOptions.map((option) => ({ value: String(option.value), label: option.label })),
                            ]}
                              name="category"
                              required={true}
                              modal
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Owner <span className="text-danger">*</span>
                            </label>
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-faint" />
                                    <input
                                        type="text"
                                        value={ownerSearchQuery}
                                        onChange={(e) => setOwnerSearchQuery(e.target.value)}
                                        onFocus={() => setShowOwnerDropdown(true)}
                                        placeholder="Search owner..."
                                        className="w-full pl-10 pr-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-bright dark:text-white"
                                    />
                                </div>
                                {showOwnerDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-surface border border-line rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        <div
                                            className="px-3 py-2 hover:bg-bright-soft cursor-pointer text-sm text-ink-3"
                                            onClick={() => {
                                                setForm(prev => ({ ...prev, owner_id: 0 }));
                                                setOwnerSearchQuery("");
                                                setShowOwnerDropdown(false);
                                            }}
                                        >
                                            Select Owner
                                        </div>
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user) => (
                                                <div
                                                    key={user.user_id}
                                                    className={`px-3 py-2 hover:bg-bright-soft  cursor-pointer text-sm ${
                                                        form.owner_id === user.user_id
                                                            ? 'bg-bright-soft  text-bright-deep'
                                                            : 'text-ink-3'
                                                    }`}
                                                    onClick={() => {
                                                        setForm(prev => ({ ...prev, owner_id: user.user_id }));
                                                        setOwnerSearchQuery(`${user.account.first_name} ${user.account.last_name}`);
                                                        setShowOwnerDropdown(false);
                                                    }}
                                                >
                                                    {user.account.first_name} {user.account.last_name}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-muted">
                                                No users found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {showOwnerDropdown && (
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowOwnerDropdown(false)}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Impact <span className="text-danger">*</span>
                            </label>
                            <Dropdown
                              value={String(form.impact ?? '')}
                              onChange={(__v: string) => handleChange({ target: { name: "impact", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                              options={[
                              ...impactOptions.map((option) => ({ value: String(option.value), label: option.label })),
                            ]}
                              name="impact"
                              required={true}
                              modal
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Probability{" "}
                                <span className="text-danger">*</span>
                            </label>
                            <Dropdown
                              value={String(form.probability ?? '')}
                              onChange={(__v: string) => handleChange({ target: { name: "probability", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                              options={[
                              ...probabilityOptions.map((option) => ({ value: String(option.value), label: option.label })),
                            ]}
                              name="probability"
                              required={true}
                              modal
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Status
                            </label>
                            <Dropdown
                              value={String(form.status ?? '')}
                              onChange={(__v: string) => handleChange({ target: { name: "status", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                              options={[
                              ...statusOptions.map((option) => ({ value: String(option.value), label: option.label })),
                            ]}
                              name="status"
                              modal
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Approval Status
                            </label>
                            <Dropdown
                              value={String(form.approvalStatus ?? '')}
                              onChange={(__v: string) => handleChange({ target: { name: "approvalStatus", value: __v } } as React.ChangeEvent<HTMLSelectElement>)}
                              options={[
                              ...approvalStatusOptions.map((option) => ({ value: String(option.value), label: option.label })),
                            ]}
                              name="approvalStatus"
                              modal
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-ink-3 mb-1">
                                Identified Date
                            </label>
                            <input
                                type="date"
                                name="identified_date"
                                value={form.identified_date}
                                onChange={handleChange}
                                min={isSingleProjectMode && project?.start_date ? new Date(project.start_date).toISOString().split('T')[0] : undefined}
                                max={isSingleProjectMode && project?.planned_end_date ? new Date(project.planned_end_date).toISOString().split('T')[0] : undefined}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bright  dark:text-white ${
                                    dateError ? 'border-danger ' : 'border-line'
                                }`}
                            />
                            {dateError && (
                                <div className="mt-1 flex items-center text-sm text-danger">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {dateError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Calculated Risk Score Display */}
                    <div className="bg-surface-2 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-ink-3">
                                Calculated Risk Score:
                            </span>
                            <span className="text-lg font-bold text-bright">
                                {calculateRiskScore(
                                    form.impact,
                                    form.probability
                                )}
                            </span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                            Based on Impact × Probability (High=3, Medium=2,
                            Low=1)
                        </p>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-line">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || (isSingleProjectMode && !!dateError)}
                            className="bg-bright hover:bg-bright-deep text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner size={16} className="mr-2" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Create Risk
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
