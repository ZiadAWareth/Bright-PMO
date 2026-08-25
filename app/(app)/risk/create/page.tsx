"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => router.back()} 
                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold">Create New Risk</h1>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="max-w-2xl bg-white dark:bg-slate-800 rounded-lg p-6 shadow space-y-6">
                <div>
                    <label className="block font-medium mb-1" htmlFor="project">Project <span className="text-red-500">*</span></label>
                    <select
                        id="project"
                        name="project_id"
                        value={form.project_id}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Select a project</option>
                        {projects.map((project) => (
                            <option key={project.project_id} value={project.project_id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block font-medium mb-1" htmlFor="name">Risk Name <span className="text-red-500">*</span></label>
                    <input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter risk name"
                    />
                </div>

                <div>
                    <label className="block font-medium mb-1" htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                        placeholder="Describe the risk"
                    />
                </div>

                <div>
                    <label className="block font-medium mb-1" htmlFor="category">Category <span className="text-red-500">*</span></label>
                    <select
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Select a category</option>
                        {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block font-medium mb-1" htmlFor="identified_date">Identified Date <span className="text-red-500">*</span></label>
                    <input
                        id="identified_date"
                        type="date"
                        name="identified_date"
                        value={form.identified_date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={handleChange}
                        required
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium mb-1" htmlFor="impact">Impact Level</label>
                        <select
                            id="impact"
                            name="impact"
                            value={form.impact}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-medium mb-1" htmlFor="probability">Probability</label>
                        <select
                            id="probability"
                            name="probability"
                            value={form.probability}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-medium mb-1" htmlFor="approvalStatus">Approval Status</label>
                        <select
                            id="approvalStatus"
                            name="approvalStatus"
                            value={form.approvalStatus}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {approvalStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block font-medium mb-1" htmlFor="currentStatus">Current Status</label>
                        <select
                            id="currentStatus"
                            name="currentStatus"
                            value={form.currentStatus}
                            onChange={handleChange}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {currentStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block font-medium mb-1" htmlFor="score">Risk Score (0-10)</label>
                    <input
                        id="score"
                        name="score"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={form.score}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-400"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Risk</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </DashboardLayout>
    );
};

export default RiskCreatePage;
