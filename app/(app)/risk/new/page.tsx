"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Save } from "lucide-react";
import axios from "axios";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
    CancelButton,
    Field,
    FieldGrid,
    FormError,
    FormFooter,
    FormSection,
    PageHeader,
    SubmitButton,
    inputClass,
    textareaClass,
} from "@/components/ui/form-shell";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";

interface Project {
    project_id: number;
    name: string;
}

interface User {
    user_id: number;
    account: {
        account_id: number;
    };
}

interface RiskForm {
    name: string;
    description: string;
    category: string;
    identified_date: string;
    impact: string;
    probability: string;
    status: string;
    owner_id: number;
    approvalStatus: string;
    currentStatus: string;
    score: number;
    project_id: number;
}

const defaultForm: RiskForm = {
    name: "",
    description: "",
    category: "",
    identified_date: new Date().toISOString().slice(0, 10),
    impact: "medium",
    probability: "medium",
    status: "Open",
    owner_id: 0,
    approvalStatus: "Pending",
    currentStatus: "Open",
    score: 0,
    project_id: 0,
};

// Predefined status options
const approvalStatusOptions = ["Pending", "Approved for Mitigation"];
const currentStatusOptions = ["Open", "Mitigation in Progress", "Closed"];
const categoryOptions = ["Technical", "Schedule", "Cost", "Resource", "Quality", "Communication", "External", "Other"];

const RiskCreatePage = () => {
    const router = useRouter();
    const [form, setForm] = useState<RiskForm>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserAndProjects = async () => {
            try {
                const userResponse = await axios.get("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                // Set owner_id from account_id
                setForm(prev => ({ ...prev, owner_id: userResponse.data.account_id }));

                // Fetch projects
                const projectsResponse = await axios.get("/api/projects", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });
                setProjects(projectsResponse.data);
            } catch (err: any) {
                setError(err.message || "Failed to load necessary data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndProjects();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Convert project_id and score to numbers
        if (name === 'project_id') {
            setForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else if (name === 'score') {
            setForm(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
        setError(null); // Clear any previous errors when user makes changes
    };

    const validateForm = () => {
        if (!form.project_id) {
            setError("Please select a project");
            return false;
        }
        if (!form.name.trim()) {
            setError("Risk name is required");
            return false;
        }
        if (!form.category) {
            setError("Please select a risk category");
            return false;
        }
        
        // Validate date is not in the past
        const selectedDate = new Date(form.identified_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            setError("Identified date cannot be in the past");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        if (!form.owner_id) {
            setError("User account not properly initialized. Please refresh the page.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Ensure all numeric fields are properly typed
            const dataToSend = {
                ...form,
                project_id: Number(form.project_id),
                score: Number(form.score),
                owner_id: Number(form.owner_id)
            };

            await axios.post("/api/risks", dataToSend, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            router.push("/risk");
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Failed to create risk. Please try again.";
            setError(errorMessage);
            console.error("Error creating risk:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <DashboardLayout hideHeader>
                    <div className="space-y-6">
                        <PageHeader
                            title="New Risk"
                            subtitle="Log a risk against a project and set its initial assessment"
                            backHref="/risk"
                            backLabel="Back to Risks"
                        />
                        <div className="flex items-center justify-center py-24">
                            <Spinner size={32} className="text-bright" />
                        </div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <DashboardLayout hideHeader>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                >
                    <PageHeader
                        title="New Risk"
                        subtitle="Log a risk against a project and set its initial assessment"
                        backHref="/risk"
                        backLabel="Back to Risks"
                    />

                    <FormError>{error}</FormError>

                    <FormSection
                        title="Identification"
                        description="What the risk is and which project it threatens."
                    >
                        <FieldGrid>
                            <Field label="Project" required htmlFor="project" full>
                                <Dropdown
                                    value={String(form.project_id || "")}
                                    onChange={(__v: string) =>
                                        handleChange({
                                            target: { name: "project_id", value: __v },
                                        } as React.ChangeEvent<HTMLSelectElement>)
                                    }
                                    options={[
                                        { value: "", label: "Select a project" },
                                        ...projects.map((project) => ({
                                            value: String(project.project_id),
                                            label: project.name,
                                        })),
                                    ]}
                                    id="project"
                                    name="project_id"
                                    disabled={isSubmitting}
                                />
                            </Field>

                            <Field label="Risk Name" required htmlFor="name" full>
                                <input
                                    id="name"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Vendor lead time exceeds schedule float"
                                    disabled={isSubmitting}
                                    className={inputClass}
                                />
                            </Field>

                            <Field
                                label="Description"
                                htmlFor="description"
                                full
                                hint="What could happen, and what would it affect?"
                            >
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Describe the risk"
                                    disabled={isSubmitting}
                                    className={textareaClass}
                                />
                            </Field>

                            <Field label="Category" required htmlFor="category">
                                <Dropdown
                                    value={String(form.category ?? "")}
                                    onChange={(__v: string) =>
                                        handleChange({
                                            target: { name: "category", value: __v },
                                        } as React.ChangeEvent<HTMLSelectElement>)
                                    }
                                    options={[
                                        { value: "", label: "Select a category" },
                                        ...categoryOptions.map((category) => ({
                                            value: category,
                                            label: category,
                                        })),
                                    ]}
                                    id="category"
                                    name="category"
                                    disabled={isSubmitting}
                                />
                            </Field>

                            <Field
                                label="Identified Date"
                                required
                                htmlFor="identified_date"
                            >
                                <input
                                    id="identified_date"
                                    type="date"
                                    name="identified_date"
                                    value={form.identified_date}
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    className={inputClass}
                                />
                            </Field>
                        </FieldGrid>
                    </FormSection>

                    <FormSection
                        title="Assessment"
                        description="How likely the risk is and how much it would hurt."
                    >
                        <FieldGrid>
                            <Field label="Impact Level" htmlFor="impact">
                                <Dropdown
                                    value={String(form.impact ?? "")}
                                    onChange={(__v: string) =>
                                        handleChange({
                                            target: { name: "impact", value: __v },
                                        } as React.ChangeEvent<HTMLSelectElement>)
                                    }
                                    options={[
                                        { value: "high", label: "High" },
                                        { value: "medium", label: "Medium" },
                                        { value: "low", label: "Low" },
                                    ]}
                                    id="impact"
                                    name="impact"
                                    disabled={isSubmitting}
                                />
                            </Field>

                            <Field label="Probability" htmlFor="probability">
                                <Dropdown
                                    value={String(form.probability ?? "")}
                                    onChange={(__v: string) =>
                                        handleChange({
                                            target: { name: "probability", value: __v },
                                        } as React.ChangeEvent<HTMLSelectElement>)
                                    }
                                    options={[
                                        { value: "high", label: "High" },
                                        { value: "medium", label: "Medium" },
                                        { value: "low", label: "Low" },
                                    ]}
                                    id="probability"
                                    name="probability"
                                    disabled={isSubmitting}
                                />
                            </Field>

                            <Field
                                label="Risk Score"
                                htmlFor="score"
                                hint="0–10, where 10 is the most severe."
                            >
                                <input
                                    id="score"
                                    name="score"
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={form.score}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    className={inputClass}
                                />
                            </Field>
                        </FieldGrid>
                    </FormSection>

                    <FormSection
                        title="Status"
                        description="Where this risk sits in the approval and mitigation flow."
                    >
                        <FieldGrid>
                            <Field label="Approval Status" htmlFor="approvalStatus">
                                <Dropdown
                                    value={String(form.approvalStatus ?? "")}
                                    onChange={(__v: string) =>
                                        handleChange({
                                            target: { name: "approvalStatus", value: __v },
                                        } as React.ChangeEvent<HTMLSelectElement>)
                                    }
                                    options={approvalStatusOptions.map((status) => ({
                                        value: status,
                                        label: status,
                                    }))}
                                    id="approvalStatus"
                                    name="approvalStatus"
                                    disabled={isSubmitting}
                                />
                            </Field>

                            <Field label="Current Status" htmlFor="currentStatus">
                                <Dropdown
                                    value={String(form.currentStatus ?? "")}
                                    onChange={(__v: string) =>
                                        handleChange({
                                            target: { name: "currentStatus", value: __v },
                                        } as React.ChangeEvent<HTMLSelectElement>)
                                    }
                                    options={currentStatusOptions.map((status) => ({
                                        value: status,
                                        label: status,
                                    }))}
                                    id="currentStatus"
                                    name="currentStatus"
                                    disabled={isSubmitting}
                                />
                            </Field>
                        </FieldGrid>
                    </FormSection>

                    <FormFooter>
                        <CancelButton href="/risk" />
                        <SubmitButton
                            busy={isSubmitting}
                            busyLabel="Saving…"
                            icon={<Save className="h-4 w-4" aria-hidden="true" />}
                        >
                            Create Risk
                        </SubmitButton>
                    </FormFooter>
                </form>
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default RiskCreatePage;
